"""
ScoreReport + ScoreDimension — AI-generated band score per attempt.

ScoreReport: one row per attempt (overall band + raw JSON).
ScoreDimension: one row per rubric dimension per report (5 for speaking, 5 for writing).
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import Integer, Numeric, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ScoreReport(Base, TimestampMixin):
    """Overall band score for a completed attempt."""

    __tablename__ = "score_reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attempts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # one report per attempt
        index=True,
    )
    estimated_band: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False)
    scoring_model: Mapped[str] = mapped_column(Text, nullable=False)  # which LLM generated this
    raw_rubric_json: Mapped[dict | None] = mapped_column(JSONB)        # full LLM response

    __table_args__ = (
        Index("idx_score_reports_attempt", "attempt_id"),
    )


class ScoreDimension(Base, TimestampMixin):
    """Per-dimension score row (one per rubric criterion per report)."""

    __tablename__ = "score_dimensions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("score_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dimension: Mapped[str] = mapped_column(Text, nullable=False)  # e.g. "coherence"
    score: Mapped[int] = mapped_column(Integer, nullable=False)   # 1–12
    max_score: Mapped[int] = mapped_column(Integer, nullable=False, default=12)

    __table_args__ = (
        Index("idx_score_dimensions_report", "report_id"),
    )
