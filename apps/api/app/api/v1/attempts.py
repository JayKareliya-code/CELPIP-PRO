"""Attempt status polling + retry routes."""
import uuid
import logging
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.attempt import Attempt
from app.models.score_report import ScoreReport
from app.repositories.attempt_repo import AttemptRepository
from app.schemas.attempt import AttemptStatusResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/attempts/{attempt_id}/status", response_model=AttemptStatusResponse)
async def get_attempt_status(
    attempt_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AttemptStatusResponse:
    """Lightweight status poll — single indexed DB read, safe at 3-second cadence.

    The frontend `useAttemptStatus` hook calls this every 3 s until
    status is 'complete' or 'failed'.
    """
    attempt = await AttemptRepository(db).get_status(attempt_id, user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Include estimated_band on completion so the status card can show a preview
    estimated_band: float | None = None
    if attempt.status == "complete":
        result = await db.execute(
            select(ScoreReport.estimated_band)
            .where(ScoreReport.attempt_id == attempt_id)
        )
        row = result.scalar_one_or_none()
        if row is not None:
            estimated_band = float(row)

    return AttemptStatusResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        skill=attempt.skill,
        celery_task_id=attempt.celery_task_id,
        error_message=attempt.error_message,
        report_available=(attempt.status == "complete"),
        estimated_band=estimated_band,
        created_at=attempt.created_at,
        updated_at=attempt.updated_at,
    )


@router.post("/attempts/{attempt_id}/retry", response_model=AttemptStatusResponse)
async def retry_attempt(
    attempt_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AttemptStatusResponse:
    """Re-enqueue a failed scoring attempt WITHOUT consuming additional quota.

    Only attempts with status='failed' can be retried.  Pending/processing/
    complete attempts are rejected with 409 Conflict.

    The retry reuses the existing audio/essay already stored in S3 — no new
    upload is required.  It simply resets the attempt status and re-enqueues
    the appropriate Celery task.
    """
    attempt = await AttemptRepository(db).get_status(attempt_id, user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.status != "failed":
        raise HTTPException(
            status_code=409,
            detail=f"Only 'failed' attempts can be retried. Current status: '{attempt.status}'.",
        )

    # Reset attempt state
    attempt.status = "pending"
    attempt.error_message = None
    attempt.celery_task_id = None
    db.add(attempt)
    await db.flush()

    # Re-enqueue the correct pipeline based on skill + mock flag
    try:
        if attempt.skill == "speaking":
            if attempt.is_mock_test:
                from app.workers.mock_exam_tasks import score_mock_exam_task  # noqa: PLC0415
                # Speaking mock tasks use a different table (MockExamTaskAttempt).
                # The attempt row here is from the attempts table — shouldn't be
                # reached via this path, but guard defensively.
                raise HTTPException(
                    status_code=422,
                    detail="Speaking mock exam tasks cannot be retried via this endpoint. "
                           "Use the mock exam session endpoint.",
                )
            else:
                from app.workers.speaking_tasks import score_speaking_attempt  # noqa: PLC0415
                task = score_speaking_attempt.delay(str(attempt_id))
        elif attempt.skill == "writing":
            if attempt.is_mock_test:
                from app.workers.writing_mock_tasks import score_writing_mock_task  # noqa: PLC0415
                task = score_writing_mock_task.delay(str(attempt_id))
            else:
                from app.workers.writing_tasks import score_writing_attempt  # noqa: PLC0415
                task = score_writing_attempt.delay(str(attempt_id))
        else:
            raise HTTPException(status_code=422, detail=f"Unknown skill: {attempt.skill!r}")

        attempt.celery_task_id = task.id
        attempt.status = "processing"
        db.add(attempt)
        await db.flush()

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to re-enqueue retry for attempt %s", attempt_id)
        attempt.status = "failed"
        db.add(attempt)
        await db.flush()
        raise HTTPException(
            status_code=503,
            detail="Scoring service unavailable. Please try again in a moment.",
        )

    logger.info(
        "Attempt %s retried by user %s — new task %s",
        attempt_id, user.id, attempt.celery_task_id,
    )

    return AttemptStatusResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        skill=attempt.skill,
        celery_task_id=attempt.celery_task_id,
        error_message=None,
        report_available=False,
        estimated_band=None,
        created_at=attempt.created_at,
        updated_at=attempt.updated_at,
    )
