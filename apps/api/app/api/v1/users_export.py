"""
app/api/v1/users_export.py — GDPR data export endpoints.

POST /users/me/export
  → Creates a pending export_jobs row, enqueues build_user_export Celery task.
  → Returns { job_id } with 202 Accepted.
  → Rate-limited: 1 export request per user per 24 hours.

GET /users/me/export/status/{job_id}
  → Returns { status, download_url, expires_at, error_message }.
  → 404 if the job doesn't exist or is owned by a different user.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.models.export_job import ExportJob
from app.models.user import User

router = APIRouter()

# ── Request / Response schemas ────────────────────────────────────────────────

class ExportStartResponse(BaseModel):
    job_id: str
    message: str = "Export started. Poll the status endpoint for progress."


class ExportStatusResponse(BaseModel):
    job_id: str
    status: str                   # pending | processing | complete | failed
    download_url: str | None
    expires_at: str | None        # ISO 8601
    error_message: str | None


# ── Helpers ───────────────────────────────────────────────────────────────────

_24H = timedelta(hours=24)


async def _recent_export_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Return the number of export jobs created by this user in the last 24 h."""
    cutoff = datetime.now(timezone.utc) - _24H
    result = await db.execute(
        select(func.count()).select_from(ExportJob).where(
            ExportJob.user_id == user_id,
            ExportJob.created_at >= cutoff,
        )
    )
    return result.scalar_one()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/me/export",
    response_model=ExportStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request a GDPR data export",
)
@limiter.limit("5/minute")   # global safety guard; the 1/24h logic is handled in-handler
async def request_data_export(
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> ExportStartResponse:
    """
    Initiate a GDPR data export for the authenticated user.

    Rate-limited to 1 request per 24 hours per user (returns 429 if exceeded).
    The export is processed asynchronously; poll GET /users/me/export/status/{job_id}
    for the download link.
    """
    # ── 1/24h rate limit ──────────────────────────────────────────────────────
    recent = await _recent_export_count(db, user.id)
    if recent >= 1:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You can only request one data export every 24 hours.",
        )

    # ── Create pending job ────────────────────────────────────────────────────
    job = ExportJob(
        id=uuid.uuid4(),
        user_id=user.id,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.add(job)
    await db.flush()   # get the id without committing — get_db commits on exit

    # ── Enqueue Celery task ───────────────────────────────────────────────────
    from app.workers.export_tasks import build_user_export  # local import avoids circular
    build_user_export.delay(str(job.id), str(user.id))

    return ExportStartResponse(job_id=str(job.id))


@router.get(
    "/me/export/status/{job_id}",
    response_model=ExportStatusResponse,
    summary="Poll GDPR export status",
)
async def get_export_status(
    job_id: uuid.UUID,
    user:   Annotated[User, Depends(get_current_user)],
    db:     Annotated[AsyncSession, Depends(get_db)],
) -> ExportStatusResponse:
    """
    Return the status of a previously requested data export.

    Returns 404 (not 403) for jobs that don't exist or belong to another user,
    to avoid leaking the existence of other users' jobs.
    """
    result = await db.execute(
        select(ExportJob).where(
            ExportJob.id == job_id,
            ExportJob.user_id == user.id,
        )
    )
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export job not found.",
        )

    return ExportStatusResponse(
        job_id=str(job.id),
        status=job.status,
        download_url=job.s3_url,
        expires_at=job.expires_at.isoformat() if job.expires_at else None,
        error_message=job.error_message,
    )
