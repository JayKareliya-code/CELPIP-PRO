"""
ScoreReport + ScoreDimension — AI-generated band score per attempt.

ScoreReport: one row per attempt (overall band + raw JSON).
  schema_version=1: legacy 5-dimension model (pre-May 2026).
  schema_version=2: official CELPIP 4-dimension model (content_coherence, vocabulary,
                    listenability/readability, task_fulfillment).
ScoreDimension: one row per rubric dimension per report (4 for schema_version=2).
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import Integer, Numeric, Text, String, ForeignKey, Index
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
    scoring_model: Mapped[str] = mapped_column(Text, nullable=False)   # which LLM generated this
    raw_rubric_json: Mapped[dict | None] = mapped_column(JSONB)         # full LLM response

    # Scoring schema version — identifies which dimension model was used:
    #   1 = legacy 5-dimension model (pre-May 2026 scores)
    #   2 = official CELPIP 4-dimension model (current)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Official CELPIP output format band range, e.g. "7-8" or "9-10".
    # Populated only for schema_version=2 scores.
    likely_range: Mapped[str | None] = mapped_column(String(10), nullable=True)

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
