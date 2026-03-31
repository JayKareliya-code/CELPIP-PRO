"""
Transcript — STT output for speaking attempts.

One row per speaking attempt.  Writing attempts do NOT have a transcript
(they use essay_text from writing_attempts directly).
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import Numeric, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Transcript(Base, TimestampMixin):
    """Whisper STT transcript for a speaking attempt."""

    __tablename__ = "transcripts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attempts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # one transcript per speaking attempt
        index=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(Text, nullable=False, default="openai")
    # Whisper verbose_json doesn't reliably return a confidence; field is nullable
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))

    __table_args__ = (
        Index("idx_transcripts_attempt", "attempt_id"),
    )
