"""
Reports API endpoint.

GET /api/v1/attempts/{attempt_id}/report
  → Returns the full AI-generated feedback report for a completed attempt.
  → 404 if not found, not complete, or owned by a different user
    (no information leakage — same response for missing vs unauthorised).
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_read_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.report import ReportResponse
from app.services.report_service import fetch_report

router = APIRouter(prefix="/attempts", tags=["Reports"])


@router.get("/{attempt_id}/report", response_model=ReportResponse)
async def get_report(
    attempt_id: UUID,
    db: AsyncSession = Depends(get_read_db),
    current_user: User = Depends(get_current_user),
) -> ReportResponse:
    """
    Retrieve the full feedback report for a completed attempt.

    Security: returns 404 (not 403) for attempts owned by other users to
    avoid leaking the existence of other users' data.
    """
    report = await fetch_report(
        db,
        attempt_id=attempt_id,
        user_id=current_user.id,
        plan=current_user.plan,
    )
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or not yet available.",
        )
    return report
