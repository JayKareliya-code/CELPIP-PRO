"""Shared synchronous SQLAlchemy engine for Celery workers.

Celery tasks run in a sync context and cannot use the app's async engine
(``app.core.deps.engine``). This module is the single canonical sync engine —
previously each worker defined its own ``_get_sync_engine`` with three slightly
different URL-derivation and pooling configurations.

Safe with Celery's fork model: ``get_sync_engine`` is only ever called inside
task bodies (post-fork), so each worker process builds its own engine and
connections — never inherited across the fork.
"""
from __future__ import annotations

from functools import lru_cache

import sqlalchemy as sa

from app.core.config import settings


@lru_cache(maxsize=1)
def get_sync_engine() -> sa.engine.Engine:
    """Return the process-wide synchronous engine for Celery workers.

    The DATABASE_URL is rewritten from the asyncpg driver to psycopg2 (the sync
    driver, installed via psycopg2-binary). Cached for the worker process
    lifetime.

    Pool sizing
    -----------
    pool_size=5 / max_overflow=10 — with ``task_acks_late=True`` and pipeline
    tasks holding a session open across an OpenAI call, the previous 2+2 ceiling
    was tight enough to cause pool-checkout timeouts when reconciliation and
    export ran alongside scoring. Five persistent + ten burst connections is
    comfortable for the worker concurrencies we run (default `--concurrency=2`
    per process) without overwhelming Postgres.

    Connection recycling
    --------------------
    pool_recycle=1800 — managed Postgres (RDS / Supabase / Render) closes idle
    connections after ~5–30 min. Recycling at 30 min ensures we never hand out
    a server-side-closed socket to a task. pool_pre_ping is the runtime
    safety net for the in-between case.
    """
    sync_url = settings.DATABASE_URL.replace(
        "postgresql+asyncpg://", "postgresql+psycopg2://"
    )
    return sa.create_engine(
        sync_url,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=1800,
    )
