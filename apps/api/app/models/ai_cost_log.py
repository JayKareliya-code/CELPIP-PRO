"""
AICostLog — per-call token usage + estimated USD cost.

One row is inserted for every OpenAI (or other provider) API call made
during attempt scoring.  Multiple rows per attempt are expected
(Whisper → stt, GPT-4o-mini → scoring).
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import Integer, Numeric, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AICostLog(Base, TimestampMixin):
    """Token usage + estimated cost per AI API call."""

    __tablename__ = "ai_cost_log"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Provider metadata
    provider: Mapped[str] = mapped_column(Text, nullable=False)   # openai | anthropic | gemini
    model: Mapped[str] = mapped_column(Text, nullable=False)       # gpt-4o-mini, whisper-1, …
    operation: Mapped[str] = mapped_column(Text, nullable=False)   # stt | scoring | feedback

    # Token counts
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Cost estimate (approximate; never used for billing)
    estimated_cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))

    __table_args__ = (
        Index("idx_ai_cost_attempt", "attempt_id"),
        Index("idx_ai_cost_created", "created_at"),
    )
