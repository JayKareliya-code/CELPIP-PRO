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

from app.services.ai.pipeline.writing_mock_pipeline import run_writing_mock_pipeline
from app.workers._sync_db import get_sync_engine

logger = logging.getLogger(__name__)


def _mark_failed(attempt_id: str, error: str) -> None:
    """Synchronous failure write — runs outside the asyncio event loop."""
    with get_sync_engine().begin() as conn:
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
    retry_backoff=True,          # exponential: 30 s → 60 s → 120 s
    retry_backoff_max=600,
    retry_jitter=True,           # spread retries across worker processes
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
