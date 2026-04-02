"""Attempt status polling route."""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.score_report import ScoreReport
from app.repositories.attempt_repo import AttemptRepository
from app.schemas.attempt import AttemptStatusResponse

router = APIRouter()


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
