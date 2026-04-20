# ─────────────────────────────────────────────────────────────────────────────
# billing/routes/events.py — GET /billing/plan-events  (Server-Sent Events)
#
# Streams real-time plan-change notifications to the authenticated user's
# browser tab over a persistent HTTP connection.
#
# Authentication flow:
#   The EventSource browser API does not support custom request headers, so
#   the Clerk JWT is passed via the ``?token=`` query parameter.
#   The token travels only over HTTPS in production; we validate it identically
#   to the standard ``get_current_user`` dependency.
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

from typing import Annotated, AsyncGenerator
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_redis_pool
from app.api.v1.billing.constants import (
    PLAN_CHANNEL_PREFIX,
    SSE_KEEPALIVE_SECONDS,
    SSE_MAX_DURATION_SECONDS,
)
from app.api.v1.billing.helpers import resolve_user_from_token

logger = logging.getLogger(__name__)
router = APIRouter()

# ── SSE response headers ──────────────────────────────────────────────────────

_SSE_HEADERS: dict[str, str] = {
    "Cache-Control":     "no-cache",
    "X-Accel-Buffering": "no",      # nginx: disable proxy read buffering
    "Connection":        "keep-alive",
}


# ── Route ─────────────────────────────────────────────────────────────────────


@router.get("/billing/plan-events", include_in_schema=False)
async def plan_events_stream(
    token: Annotated[str, Query(description="Clerk JWT for SSE authentication")],
    db:    Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """
    Server-Sent Events stream — delivers plan-change notifications in real time.

    The client (``usePlanEvents`` hook) opens and manages this connection.
    On receiving a ``plan-updated`` event the hook invalidates React Query
    caches so the UI re-renders immediately with the new plan.
    """
    user = await resolve_user_from_token(token, db)

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
