"""
ReconciliationRun — audit row written by the nightly Stripe ↔ DB cron.

One row per run: records when it ran, how many paid users were checked,
how many corrections (downgrades) were applied, and any fatal error message
that caused the run to abort early.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ReconciliationRun(Base):
    """One row per nightly reconciliation run."""

    __tablename__ = "reconciliation_runs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    run_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    users_checked: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    corrections_made: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
