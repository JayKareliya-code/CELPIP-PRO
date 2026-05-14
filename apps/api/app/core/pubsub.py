"""
app/core/pubsub.py — Shared Redis Pub/Sub fan-out for SSE connections.

Problem solved
──────────────
Without this module every SSE connection opens its own Redis SUBSCRIBE
command.  100 concurrent users → 100 Redis pubsub clients.  With
PlanEventBus there is exactly ONE Redis subscriber per API worker process;
messages are dispatched in-process to asyncio.Queue objects, one per
active SSE connection.

Usage (wire in main.py lifespan)
─────────────────────────────────
    from app.core.pubsub import PlanEventBus
    from app.core.deps import get_redis_pool

    @asynccontextmanager
    async def lifespan(app):
        bus = PlanEventBus(get_redis_pool())
        app.state.plan_event_bus = bus
        await bus.start()
        yield
        await bus.stop()
        ...

Usage inside an SSE route
─────────────────────────
    bus: PlanEventBus = request.app.state.plan_event_bus
    q = await bus.subscribe(user_id)
    try:
        msg = await asyncio.wait_for(q.get(), timeout=25)
        yield f"event: plan-updated\\ndata: {msg}\\n\\n"
    finally:
        await bus.unsubscribe(user_id, q)
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import DefaultDict

import structlog

log = structlog.get_logger(__name__)

# Channel pattern the bus subscribes to.  Must match the channel published
# by the Stripe webhook handler: f"celpip:plan_updates:{user_id}".
_CHANNEL_PATTERN = "celpip:plan_updates:*"

# Cap concurrent SSE connections per user. A normal user has 1–2 browser tabs;
# this bounds the asyncio.Queue / task fan-out a single account can hold open.
_MAX_CONNECTIONS_PER_USER = 10


class PlanEventBusOverloaded(Exception):
    """Raised by subscribe() when a user already holds the maximum number of
    concurrent SSE connections."""


class PlanEventBus:
    """
    A single Redis pub/sub subscriber that fans out to in-process queues.

    Thread-safety note: this class is *not* thread-safe; it is designed for
    use inside a single asyncio event loop (i.e. one FastAPI worker process).
    Gunicorn/uvicorn multi-process setups each get their own instance, which
    is correct — each process has its own event loop.
    """

    def __init__(self, redis) -> None:  # noqa: ANN001
        self._redis = redis
        # user_id → set of queues for all SSE connections from that user
        self._subs: DefaultDict[str, set[asyncio.Queue[str]]] = defaultdict(set)
        self._task: asyncio.Task | None = None
        self._pubsub = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def start(self) -> None:
        """Start the dispatch loop.

        The loop itself owns Redis (re)subscription, so a Redis blip at startup
        — or any time after — is retried rather than fatal.
        """
        self._task = asyncio.create_task(self._run(), name="plan-event-bus")
        log.info("PlanEventBus started", pattern=_CHANNEL_PATTERN)

    async def stop(self) -> None:
        """Cancel the dispatch loop and clean up the Redis connection."""
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._pubsub:
            try:
                await self._pubsub.punsubscribe(_CHANNEL_PATTERN)
                await self._pubsub.aclose()
            except Exception:
                pass  # best-effort
        log.info("PlanEventBus stopped")

    # ── Subscription management ───────────────────────────────────────────────

    async def subscribe(self, user_id: str) -> asyncio.Queue[str]:
        """
        Register a new SSE connection for *user_id*.

        Returns a queue the caller should read from.  Each message is the raw
        JSON string published by the webhook (e.g. ``'{"plan": "pro"}'``).

        Raises ``PlanEventBusOverloaded`` when the user already holds
        ``_MAX_CONNECTIONS_PER_USER`` open connections.
        """
        if len(self._subs.get(user_id, ())) >= _MAX_CONNECTIONS_PER_USER:
            log.warning("SSE connection cap reached — rejecting", user_id=user_id)
            raise PlanEventBusOverloaded(user_id)
        q: asyncio.Queue[str] = asyncio.Queue(maxsize=32)
        self._subs[user_id].add(q)
        log.debug(
            "SSE subscriber added",
            user_id=user_id,
            total_for_user=len(self._subs[user_id]),
        )
        return q

    async def unsubscribe(self, user_id: str, q: asyncio.Queue[str]) -> None:
        """Remove a queue when the SSE connection closes."""
        queues = self._subs.get(user_id)
        if queues:
            queues.discard(q)
            if not queues:
                del self._subs[user_id]
        log.debug("SSE subscriber removed", user_id=user_id)

    # ── Internal dispatch loop ────────────────────────────────────────────────

    async def _run(self) -> None:
        """
        Single Redis pubsub loop — runs for the lifetime of the process.

        Owns Redis (re)subscription: on any Redis error the loop closes the
        dead pubsub connection, backs off, re-subscribes and resumes — so a
        transient Redis outage cannot permanently kill SSE plan-update
        delivery. Only an explicit cancel (process shutdown) ends the loop.
        """
        backoff = 1.0
        _MAX_BACKOFF = 30.0
        log.debug("PlanEventBus._run: dispatch loop starting")

        while True:
            try:
                if self._pubsub is None:
                    self._pubsub = self._redis.pubsub()
                    await self._pubsub.psubscribe(_CHANNEL_PATTERN)
                    log.info("PlanEventBus subscribed", pattern=_CHANNEL_PATTERN)
                backoff = 1.0  # connected — reset backoff

                async for raw in self._pubsub.listen():
                    if raw is None:
                        continue
                    if raw.get("type", "") != "pmessage":
                        # subscribe/psubscribe confirmation frames — ignore
                        continue

                    channel: str = raw.get("channel", "")
                    data: str = raw.get("data", "")

                    # Extract user_id from channel name "celpip:plan_updates:<uid>"
                    parts = channel.split(":", maxsplit=2)
                    if len(parts) < 3:
                        log.warning("Unexpected channel format", channel=channel)
                        continue
                    user_id = parts[2]

                    queues = self._subs.get(user_id)
                    if not queues:
                        log.debug(
                            "PlanEventBus: no SSE subscribers for user — message dropped",
                            user_id=user_id,
                        )
                        continue

                    dispatched = 0
                    for q in list(queues):  # snapshot to allow concurrent mutation
                        try:
                            q.put_nowait(data)
                            dispatched += 1
                        except asyncio.QueueFull:
                            log.warning(
                                "SSE queue full — message dropped for user",
                                user_id=user_id,
                            )

                    log.debug(
                        "PlanEventBus dispatched",
                        user_id=user_id,
                        dispatched=dispatched,
                    )

                # listen() returned without raising — connection closed.
                log.warning("PlanEventBus: Redis listen() ended — reconnecting")

            except asyncio.CancelledError:
                log.debug("PlanEventBus._run: cancelled")
                return
            except Exception:
                log.exception(
                    "PlanEventBus._run: dispatch loop error — reconnecting in %.0fs",
                    backoff,
                )

            # Drop the dead pubsub so the next iteration re-creates it.
            if self._pubsub is not None:
                try:
                    await self._pubsub.aclose()
                except Exception:
                    pass
                self._pubsub = None

            try:
                await asyncio.sleep(backoff)
            except asyncio.CancelledError:
                return
            backoff = min(backoff * 2, _MAX_BACKOFF)
