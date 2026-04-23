# ─────────────────────────────────────────────────────────────────────────────
# billing/routes/events.py — GET /billing/plan-events  (Server-Sent Events)
#
# Streams real-time plan-change notifications to the authenticated user's
# browser tab over a persistent HTTP connection.
#
# Authentication flow (two-step — JWT never in URL):
#   1. Client POSTs to /billing/sse-token with the Clerk JWT in the
#      Authorization header → receives a 90 s opaque token.
#   2. Client opens EventSource to /billing/plan-events?token=<opaque_token>.
#      This endpoint looks up the opaque token in Redis to resolve the user.
#      The full Clerk JWT never appears in any URL or access log.
#
# Pub/Sub flow:
#   Stripe webhook → db.commit() → redis.publish("celpip:plan_updates:{uid}")
#                                → this SSE handler receives the message
#                                → "event: plan-updated\ndata: {...}\n\n"
#                                → browser invalidates React Query cache
#                                → UI updates without a page reload
#
# Connection lifecycle:
#   connected        — emitted immediately after successful auth
#   plan-updated     — emitted when the Redis channel receives a message
#   : ping           — SSE comment frame every 25 s to prevent proxy timeouts
#   <stream closes>  — after 1 hour; browser EventSource reconnects in ~3 s
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import asyncio
import logging
import uuid

from typing import Annotated, AsyncGenerator
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_redis_pool
from app.models.user import User
from app.api.v1.billing.constants import (
    PLAN_CHANNEL_PREFIX,
    SSE_KEEPALIVE_SECONDS,
    SSE_MAX_DURATION_SECONDS,
)
from app.api.v1.billing.routes.sse_token import SSE_TOKEN_PREFIX

logger = logging.getLogger(__name__)
router = APIRouter()

# ── SSE response headers ──────────────────────────────────────────────────────

_SSE_HEADERS: dict[str, str] = {
    "Cache-Control":     "no-cache",
    "X-Accel-Buffering": "no",      # nginx: disable proxy read buffering
    "Connection":        "keep-alive",
}


# ── Token resolution ──────────────────────────────────────────────────────────

async def _resolve_user_from_sse_token(
    token: str,
    db: AsyncSession,
) -> User | None:
    """Look up the opaque SSE token in Redis and return the User.

    Returns None when:
    - The token is not in Redis (expired or never existed).
    - The stored user_id is not a valid UUID.
    - The user is not found in the DB.

    The token is single-use: it is deleted from Redis immediately after
    resolution to prevent reuse past the 90 s TTL.
    """
    redis = get_redis_pool()
    redis_key = f"{SSE_TOKEN_PREFIX}{token}"

    # Atomic GET + DEL — consume token on first use.
    # If another tab/request races here, only one wins; the other gets None.
    user_id_str: str | None = await redis.getdel(redis_key)
    if not user_id_str:
        return None

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        logger.warning("SSE token resolved to invalid UUID: %r", user_id_str)
        return None

    user = await db.get(User, user_uuid)
    if user is None:
        logger.warning("SSE token user not found in DB: %s", user_id_str)
    return user


# ── Route ─────────────────────────────────────────────────────────────────────


@router.get("/billing/plan-events", include_in_schema=False)
async def plan_events_stream(
    token: Annotated[str, Query(description="Short-lived opaque SSE token from POST /billing/sse-token")],
    db:    Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """
    Server-Sent Events stream — delivers plan-change notifications in real time.

    The client (``usePlanEvents`` hook) first calls POST /billing/sse-token
    (with the full Clerk JWT in Authorization header), obtains a 90 s opaque
    token, then opens this EventSource with that token in the URL.

    This keeps the Clerk JWT out of access logs (nginx/ALB/CloudWatch) entirely.
    """
    user = await _resolve_user_from_sse_token(token, db)

    if not user:
        return StreamingResponse(
            _auth_error_stream(),
            status_code=401,
            media_type="text/event-stream",
        )

    user_id_str = str(user.id)
    channel     = f"{PLAN_CHANNEL_PREFIX}{user_id_str}"
    redis_pool  = get_redis_pool()

    logger.info("SSE connection opened: user=%s channel=%s", user_id_str, channel)

    return StreamingResponse(
        _event_generator(user_id_str, channel, redis_pool),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


# ── Generators ────────────────────────────────────────────────────────────────


async def _auth_error_stream() -> AsyncGenerator[str, None]:
    """Single-frame stream that signals an auth failure then closes."""
    yield 'event: error\ndata: {"detail": "Unauthorized"}\n\n'


async def _event_generator(
    user_id_str: str,
    channel: str,
    redis_pool,
) -> AsyncGenerator[str, None]:
    """
    Core SSE generator.

    1. Yields a ``connected`` frame so the client knows auth succeeded.
    2. Subscribes to the per-user Redis pub/sub channel.
    3. Polls for messages; yields ``plan-updated`` frames on arrival.
    4. Yields ``: ping`` comment frames every ``SSE_KEEPALIVE_SECONDS`` seconds
       to prevent intermediate proxies from closing the idle connection.
    5. Exits after ``SSE_MAX_DURATION_SECONDS``; the browser reconnects.
    """
    # Each SSE connection gets its own pubsub object — never share across requests.
    pubsub = redis_pool.pubsub()
    try:
        await pubsub.subscribe(channel)

        # Confirm auth + subscription to the client immediately.
        yield f'event: connected\ndata: {{"user_id": "{user_id_str}"}}\n\n'

        loop     = asyncio.get_event_loop()
        deadline = loop.time() + SSE_MAX_DURATION_SECONDS

        while loop.time() < deadline:
            try:
                message = await asyncio.wait_for(
                    pubsub.get_message(ignore_subscribe_messages=True),
                    timeout=SSE_KEEPALIVE_SECONDS,
                )
            except asyncio.TimeoutError:
                # Keepalive: comment frame keeps the TCP connection alive.
                yield ": ping\n\n"
                continue

            if message is None:
                # Redis returned None (queue empty) — emit keepalive and retry.
                yield ": ping\n\n"
                await asyncio.sleep(1)
                continue

            if message["type"] == "message":
                raw_data = message["data"]
                logger.info(
                    "SSE dispatching plan-updated: user=%s data=%s",
                    user_id_str, raw_data,
                )
                yield f"event: plan-updated\ndata: {raw_data}\n\n"

    except asyncio.CancelledError:
        # Client disconnected — exit the loop cleanly.
        logger.info("SSE connection closed by client: user=%s", user_id_str)

    except Exception as exc:
        logger.exception("SSE stream error for user=%s: %s", user_id_str, exc)
        yield 'event: error\ndata: {"detail": "Internal server error"}\n\n'

    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
        except Exception:
            pass  # best-effort cleanup — never let teardown raise
        logger.info("SSE connection cleaned up: user=%s", user_id_str)
