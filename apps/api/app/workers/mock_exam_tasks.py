"""
Mock exam scoring Celery worker — entry point only.

Business logic lives in app.services.ai.pipeline.mock_exam_pipeline.
This file is intentionally thin: receive attempt_id → run pipeline → handle retry.

Queue: mock_exam  (separate from the 'speaking' queue used for practice attempts)
"""
from __future__ import annotations

import asyncio
import logging

import sqlalchemy as sa
from celery import shared_task
from sqlalchemy import create_engine

from app.core.config import settings
from app.services.ai.pipeline.mock_exam_pipeline import run_mock_exam_pipeline

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
                "UPDATE mock_exam_task_attempts "
                "SET status='failed', error_message=:msg, updated_at=NOW() "
                "WHERE id=:id"
            ),
            {"msg": error[:2000], "id": attempt_id},
        )


# ── Celery task ────────────────────────────────────────────────────────────────

@shared_task(
    name="app.workers.mock_exam_tasks.score_mock_exam_task",
    bind=True,
    queue="mock_exam",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def score_mock_exam_task(self, attempt_id: str) -> dict:
    """Estimate band score for a single mock exam task recording."""
    logger.info("Mock exam scoring started: attempt=%s", attempt_id)
    try:
        asyncio.run(run_mock_exam_pipeline(attempt_id))
        return {"status": "complete", "attempt_id": attempt_id}
    except Exception as exc:
        logger.exception("Mock exam scoring failed: attempt=%s", attempt_id)
        try:
            _mark_failed(attempt_id, str(exc))
        except Exception:
            pass
        raise self.retry(exc=exc)
