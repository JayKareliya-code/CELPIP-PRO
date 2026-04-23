"""
Writing mock exam scoring Celery worker — entry point only.

Business logic lives in app.services.ai.pipeline.writing_mock_pipeline.
This file is intentionally thin: receive attempt_id → run pipeline → handle retry.

Queue: writing_mock  (separate from the 'writing' queue used for practice attempts)
"""
from __future__ import annotations

from app.core.async_worker import run_async
import logging
from uuid import UUID

import sqlalchemy as sa
from celery import shared_task
from sqlalchemy import create_engine

from app.core.config import settings
from app.services.ai.pipeline.writing_mock_pipeline import run_writing_mock_pipeline

logger = logging.getLogger(__name__)

# ── Sync engine for fail-path status update ────────────────────────────────────

_sync_engine: sa.engine.Engine | None = None


def _get_sync_engine() -> sa.engine.Engine:
    global _sync_engine
    if _sync_engine is None:
        _sync_engine = create_engine(
            settings.DATABASE_URL.replace("+asyncpg", ""),
            pool_size=2, max_overflow=2,
        )
    return _sync_engine


def _mark_failed(attempt_id: str, error: str) -> None:
    """Synchronous failure write — runs outside the asyncio event loop."""
    with _get_sync_engine().begin() as conn:
        conn.execute(
            sa.text(
                "UPDATE attempts "
                "SET status='failed', error_message=:msg, updated_at=NOW() "
                "WHERE id=:id"
            ),
            {"msg": error[:2000], "id": UUID(attempt_id)},
        )


# ── Celery task ────────────────────────────────────────────────────────────────

@shared_task(
    name="app.workers.writing_mock_tasks.score_writing_mock_task",
    bind=True,
    queue="writing_mock",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def score_writing_mock_task(self, attempt_id: str) -> dict:
    """Estimate band score for a single writing mock exam task."""
    logger.info("Writing mock scoring started: attempt=%s", attempt_id)
    try:
        run_async(run_writing_mock_pipeline(attempt_id))
        return {"status": "complete", "attempt_id": attempt_id}
    except Exception as exc:
        logger.exception("Writing mock scoring failed: attempt=%s", attempt_id)
        try:
            _mark_failed(attempt_id, str(exc))
        except Exception:
            pass
        raise self.retry(exc=exc)
