"""
app/core/async_worker.py — Persistent event-loop management for Celery workers.

WHY THIS EXISTS
───────────────
Celery uses fork-based worker processes. `asyncio.run()` creates a brand-new
event loop on every call and closes it when done. This causes two cascading
problems:

1. "Future attached to a different loop"
   asyncpg (and httpx) register low-level protocol callbacks on the loop that
   was alive when the connection/socket was created. If that loop is destroyed
   between tasks (by asyncio.run() closing it) and the GC hasn't collected all
   callbacks yet, the NEXT asyncio.run() creates Loop B while a stale callback
   from Loop A is still pending → RuntimeError.

2. Engine re-creation overhead
   Creating a new async engine (with pool_pre_ping, asyncpg dialect, etc.) on
   every single Celery task is wasteful — it opens+closes TCP connections to
   Postgres for each task.

THE FIX: one persistent loop per worker process
────────────────────────────────────────────────
• `worker_process_init` fires in each ForkPoolWorker AFTER the fork completes,
  so the loop is fresh and never inherited from the parent.
• All tasks in the same worker process share `_loop` via `run_async()`.
• The engine (in each pipeline module) can safely use @lru_cache again,
  because the loop it is bound to never changes within a worker process.
"""

from __future__ import annotations

import asyncio
import logging

from celery.signals import worker_process_init

logger = logging.getLogger(__name__)

_loop: asyncio.AbstractEventLoop | None = None


@worker_process_init.connect(weak=False)
def _create_worker_loop(**kwargs: object) -> None:
    """Create a fresh event loop for this worker process.

    Called once per ForkPoolWorker after Celery forks the parent.  The signal
    fires before any task runs, so _loop is always set by the time run_async()
    is called.
    """
    global _loop
    _loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_loop)
    logger.debug("Worker event loop created: %r", _loop)


def run_async(coro: object) -> object:
    """Run *coro* in this worker's persistent event loop.

    Equivalent to asyncio.run() but reuses the same loop across tasks so that
    asyncpg / httpx protocol callbacks never land on a dead loop.

    Raises RuntimeError if called before worker_process_init fires (e.g. in
    the main process or in tests — use asyncio.run() there instead).
    """
    if _loop is None:
        # Fallback for unit tests / direct script execution where no Celery
        # worker_process_init signal fires.  asyncio.run() is safe here because
        # there is no fork involved.
        return asyncio.run(coro)  # type: ignore[arg-type]
    return _loop.run_until_complete(coro)  # type: ignore[arg-type]
