"""
History API endpoint.

GET /api/v1/history
  → Returns a paginated list of the authenticated user's attempt history.
  → Supports optional ?skill=speaking|writing filter.
  → Supports ?page=<n>&limit=<n> pagination (default: page 1, limit 10).

GET /api/v1/history/task-scores
  → Returns the last N completed band scores for a specific skill+task_number.
  → Used by the score-progress card to render a band trend line.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_read_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.history import PaginatedHistory, PaginatedMockExamHistory, TaskScoreHistory
from app.services.history_service import get_user_history, get_mock_exam_history, get_recent_task_scores

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


@router.get("/history/task-scores", response_model=TaskScoreHistory)
async def get_task_score_history(
    skill: str = Query(
        ...,
        pattern="^(speaking|writing)$",
        description="Skill to query: 'speaking' or 'writing'.",
    ),
    task_number: int = Query(
        ..., ge=0, le=8,
        description="Task number to query (0–8 for speaking; 1–2 for writing).",
    ),
    limit: int = Query(
        default=10, ge=1, le=10,
        description="Maximum number of historical score points to return.",
    ),
    db: AsyncSession = Depends(get_read_db),
    current_user: User = Depends(get_current_user),
) -> TaskScoreHistory:
    """
    Return the last `limit` completed band scores for a specific skill+task_number.

    Results are ordered oldest → newest (for chart rendering).
    Only practice attempts are included (not mock exam attempts).
    Returns an empty scores list if the user has no prior completed attempts.
    """
    return await get_recent_task_scores(
        db,
        user_id=current_user.id,
        skill=skill,
        task_number=task_number,
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
