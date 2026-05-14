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
# Pub/Sub flow (S2-6 — shared fan-out bus):
#   Stripe webhook → db.commit() → redis.publish("celpip:plan_updates:{uid}")
#                                → PlanEventBus._run() receives the message
#                                → dispatches to per-connection asyncio.Queue
#                                → this SSE handler reads from the queue
#                                → "event: plan-updated\ndata: {...}\n\n"
#                                → browser invalidates React Query cache
#                                → UI updates without a page reload
#
#   Key improvement over the original design: there is now exactly ONE Redis
#   subscriber per API worker process, regardless of how many SSE connections
#   are open.  The PlanEventBus (app.state.plan_event_bus) fans out in-process.
#
# Connection lifecycle:
#   connected        — emitted immediately after successful auth
#   plan-updated     — emitted when a message arrives on the user's queue
#   : ping           — SSE comment frame every 25 s to prevent proxy timeouts
#   <stream closes>  — after 1 hour; browser EventSource reconnects in ~3 s
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import asyncio
import uuid

from typing import Annotated, AsyncGenerator
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

import structlog

from app.core.deps import get_db, get_redis_pool
from app.core.pubsub import PlanEventBus, PlanEventBusOverloaded
from app.models.user import User
from app.api.v1.billing.constants import (
    SSE_KEEPALIVE_SECONDS,
    SSE_MAX_DURATION_SECONDS,
)
from app.api.v1.billing.routes.sse_token import SSE_TOKEN_PREFIX

log = structlog.get_logger(__name__)
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
        log.warning("SSE token resolved to invalid UUID", token_value=user_id_str)
        return None

    user = await db.get(User, user_uuid)
    if user is None:
        log.warning("SSE token user not found in DB", user_id=user_id_str)
    return user


# ── Route ─────────────────────────────────────────────────────────────────────


@router.get("/billing/plan-events", include_in_schema=False)
async def plan_events_stream(
    request: Request,
    token:   Annotated[str, Query(description="Short-lived opaque SSE token from POST /billing/sse-token")],
    db:      Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """
    Server-Sent Events stream — delivers plan-change notifications in real time.

    The client (``usePlanEvents`` hook) first calls POST /billing/sse-token
    (with the full Clerk JWT in Authorization header), obtains a 90 s opaque
    token, then opens this EventSource with that token in the URL.

    This keeps the Clerk JWT out of access logs (nginx/ALB/CloudWatch) entirely.

    S2-6: uses the shared PlanEventBus from app.state rather than opening a
    dedicated Redis pubsub connection per SSE client.
    """
    user = await _resolve_user_from_sse_token(token, db)

    if not user:
        return StreamingResponse(
            _auth_error_stream(),
            status_code=401,
            media_type="text/event-stream",
        )

    user_id_str = str(user.id)
    bus: PlanEventBus = request.app.state.plan_event_bus

    log.info("SSE connection opened", user_id=user_id_str)

    return StreamingResponse(
        _event_generator(user_id_str, bus),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


# ── Generators ────────────────────────────────────────────────────────────────


async def _auth_error_stream() -> AsyncGenerator[str, None]:
    """Single-frame stream that signals an auth failure then closes."""
    yield 'event: error\ndata: {"detail": "Unauthorized"}\n\n'


async def _event_generator(
    user_id_str: str,
    bus: PlanEventBus,
) -> AsyncGenerator[str, None]:
    """
    Core SSE generator — reads from the shared PlanEventBus queue.

    1. Subscribes to the bus (registers an asyncio.Queue for this connection).
    2. Yields a ``connected`` frame immediately.
    3. Waits for messages; yields ``plan-updated`` frames on arrival.
    4. Emits ``: ping`` comment frames every SSE_KEEPALIVE_SECONDS seconds.
    5. Exits after SSE_MAX_DURATION_SECONDS; the browser reconnects.
    6. Always unsubscribes from the bus in the finally block.
    """
    try:
        q = await bus.subscribe(user_id_str)
    except PlanEventBusOverloaded:
        # User is holding too many concurrent SSE connections — refuse this one
        # cleanly instead of letting the stream fail mid-flight.
        log.warning("SSE rejected — connection cap reached", user_id=user_id_str)
        yield 'event: error\ndata: {"detail": "Too many open connections"}\n\n'
        return

    try:
        # Confirm auth + subscription to the client immediately.
        yield f'event: connected\ndata: {{"user_id": "{user_id_str}"}}\n\n'

        loop     = asyncio.get_event_loop()
        deadline = loop.time() + SSE_MAX_DURATION_SECONDS

        while loop.time() < deadline:
            try:
                data = await asyncio.wait_for(
                    q.get(),
                    timeout=SSE_KEEPALIVE_SECONDS,
                )
            except asyncio.TimeoutError:
                # Keepalive: comment frame keeps the TCP connection alive.
                yield ": ping\n\n"
                continue

            log.info(
                "SSE dispatching plan-updated",
                user_id=user_id_str,
                data=data,
            )
            yield f"event: plan-updated\ndata: {data}\n\n"

    except asyncio.CancelledError:
        # Client disconnected — exit the loop cleanly.
        log.info("SSE connection closed by client", user_id=user_id_str)

    except Exception:
        log.exception("SSE stream error", user_id=user_id_str)
        yield 'event: error\ndata: {"detail": "Internal server error"}\n\n'

    finally:
        await bus.unsubscribe(user_id_str, q)
        log.info("SSE connection cleaned up", user_id=user_id_str)
