"""
ExportJob — tracks one user-initiated GDPR data export request.

Lifecycle: pending → processing → complete | failed

When complete, s3_url holds a 24-hour presigned GET URL pointing to a zip
file containing all the user's data (attempts, scores, ai_cost_log entries).
The expires_at timestamp mirrors the presigned URL expiry so the frontend
can show a countdown / warn the user.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ExportJob(Base):
    """One row per user-initiated data-export request."""

    __tablename__ = "export_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # pending | processing | complete | failed
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    # Presigned S3 GET URL — populated when status == 'complete'
    s3_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    # Mirrors presigned URL expiry (now + 24h when complete)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
