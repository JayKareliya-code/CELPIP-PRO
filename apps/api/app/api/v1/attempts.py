"""Attempt status polling and history routes."""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.repositories.attempt_repo import AttemptRepository
from app.schemas.attempt import AttemptStatusResponse
from app.schemas.common import PaginatedResponse

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

    return AttemptStatusResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        skill=attempt.skill,
        celery_task_id=attempt.celery_task_id,
        error_message=attempt.error_message,
        report_available=(attempt.status == "complete"),
        created_at=attempt.created_at,
        updated_at=attempt.updated_at,
    )


@router.get("/attempts/{attempt_id}/report")
async def get_attempt_report(
    attempt_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Full scoring report (Phase 2 — returns 404 in Phase 1).

    Phase 2 will populate a scores table and return detailed band scores,
    per-criterion feedback, and an audio playback URL for speaking.
    """
    attempt = await AttemptRepository(db).get_status(attempt_id, user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    raise HTTPException(
        status_code=404,
        detail="Scoring report not yet available. Coming in Phase 2.",
    )


@router.get("/history", response_model=PaginatedResponse)
async def get_history(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skill: str | None = Query(default=None, pattern="^(speaking|writing)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
) -> PaginatedResponse:
    """Return paginated attempt history for the authenticated user.

    Optional `skill` filter: speaking | writing.
    """
    attempts, total = await AttemptRepository(db).paginated_history(
        user.id, skill, page, per_page
    )
    pages = (total + per_page - 1) // per_page  # ceiling division

    items = [
        AttemptStatusResponse(
            attempt_id=a.id,
            status=a.status,
            skill=a.skill,
            celery_task_id=a.celery_task_id,
            error_message=a.error_message,
            report_available=(a.status == "complete"),
            created_at=a.created_at,
            updated_at=a.updated_at,
        )
        for a in attempts
    ]

    return PaginatedResponse(items=items, total=total, page=page, per_page=per_page, pages=pages)
