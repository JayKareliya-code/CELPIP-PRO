"""
Mock exam scoring Celery worker — entry point only.

Business logic lives in app.services.ai.pipeline.mock_exam_pipeline.
This file is intentionally thin: receive attempt_id → run pipeline → handle retry.

Queue: mock_exam  (separate from the 'speaking' queue used for practice attempts)
"""
from __future__ import annotations

from app.core.async_worker import run_async
import logging

import sqlalchemy as sa
from celery import shared_task

from app.services.ai.pipeline.mock_exam_pipeline import run_mock_exam_pipeline
from app.workers._sync_db import get_sync_engine

logger = logging.getLogger(__name__)


def _mark_failed(attempt_id: str, error: str) -> None:
    """Synchronous failure write — runs outside the asyncio event loop."""
    with get_sync_engine().begin() as conn:
        conn.execute(
            sa.text(
                "UPDATE mock_exam_task_attempts "
                "SET status='failed', error_message=:msg, updated_at=NOW() "
                "WHERE id=:id"
            ),
            {"msg": error[:2000], "id": attempt_id},
        )


def _get_audio_s3_key(attempt_id: str) -> str | None:
    """Fetch audio_s3_key from mock_exam_task_attempts for the given attempt_id."""
    with get_sync_engine().connect() as conn:
        row = conn.execute(
            sa.text("SELECT audio_s3_key FROM mock_exam_task_attempts WHERE id = :id"),
            {"id": attempt_id},
        ).mappings().first()
    return row["audio_s3_key"] if row else None


# ── Celery task ────────────────────────────────────────────────────────────────

@shared_task(
    name="app.workers.mock_exam_tasks.score_mock_exam_task",
    bind=True,
    queue="mock_exam",
    max_retries=3,
    default_retry_delay=30,
    retry_backoff=True,          # exponential: 30 s → 60 s → 120 s
    retry_backoff_max=600,
    retry_jitter=True,           # spread retries across worker processes
    acks_late=True,
)
def score_mock_exam_task(self, attempt_id: str) -> dict:
    """Estimate band score for a single mock exam task recording."""
    logger.info("Mock exam scoring started: attempt=%s", attempt_id)
    try:
        run_async(run_mock_exam_pipeline(attempt_id))

        # S2-7: enqueue audio transcoding (webm → m4a) for iOS compatibility.
        s3_key = _get_audio_s3_key(attempt_id)
        if s3_key:
            from app.workers.transcode_tasks import transcode_audio_to_m4a  # local import
            transcode_audio_to_m4a.delay(attempt_id, s3_key, "mock_exam")
            logger.info("Transcode task enqueued: attempt=%s key=%s", attempt_id, s3_key)

        return {"status": "complete", "attempt_id": attempt_id}
    except Exception as exc:
        logger.exception("Mock exam scoring failed: attempt=%s", attempt_id)
        try:
            _mark_failed(attempt_id, str(exc))
        except Exception:
            pass
        raise self.retry(exc=exc)
