"""
History API endpoint.

GET /api/v1/history
  → Returns a paginated list of the authenticated user's attempt history.
  → Supports optional ?skill=speaking|writing filter.
  → Supports ?page=<n>&limit=<n> pagination (default: page 1, limit 10).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_read_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.history import PaginatedHistory, PaginatedMockExamHistory
from app.services.history_service import get_user_history, get_mock_exam_history

router = APIRouter(tags=["History"])


@router.get("/history", response_model=PaginatedHistory)
async def list_history(
    skill: str | None = Query(
        default=None,
        pattern="^(speaking|writing)$",
        description="Filter by skill: 'speaking' or 'writing'. Omit for all.",
    ),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)."),
    limit: int = Query(default=10, ge=1, le=50, description="Results per page (max 50)."),
    db: AsyncSession = Depends(get_read_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedHistory:
    """
    List the authenticated user's attempt history, newest first.

    Includes band score for completed attempts; None for pending/processing/failed.
    """
    return await get_user_history(
        db,
        user_id=current_user.id,
        skill=skill,
        page=page,
        limit=limit,
    )


@router.get("/history/mock-exams", response_model=PaginatedMockExamHistory)
async def list_mock_exam_history(
    page:  int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_read_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedMockExamHistory:
    """Return a paginated list of completed mock exam sessions, newest first."""
    return await get_mock_exam_history(
        db,
        user_id=current_user.id,
        page=page,
        limit=limit,
    )
