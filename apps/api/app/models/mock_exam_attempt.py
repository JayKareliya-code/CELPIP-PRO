"""
MockExamTaskAttempt — persists one audio recording from a full mock exam session.

One row per task per session. Scoring happens asynchronously via `mock_exam_tasks`
Celery queue; the `estimated_band` column is NULL until the pipeline finishes.
"""
import uuid
from decimal import Decimal

from sqlalchemy import CheckConstraint, Index, Integer, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class MockExamTaskAttempt(Base, TimestampMixin):
    """One per-task recording uploaded during a full CELPIP speaking mock exam.

    Unlike the generic ``Attempt`` + ``SpeakingAttempt`` pair (used for
    individual practice), this model is self-contained so mock-exam rows
    never pollute practice-attempt quota / history queries.
    """

    __tablename__ = "mock_exam_task_attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    # ── Session identity ──────────────────────────────────────────────────────
    session_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    """Client-generated UUID (crypto.randomUUID()) shared by all 8 tasks in one exam."""

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    task_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # ── Audio ────────────────────────────────────────────────────────────────
    audio_s3_key: Mapped[str] = mapped_column(Text, nullable=False)
    """S3 key: mock-tests/{user_id}/{session_id}/task-{N}.webm"""
    audio_duration_ms: Mapped[int | None] = mapped_column(Integer)

    # ── Scoring state ────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        Text, default="pending", nullable=False, index=True
    )
    """Pipeline states: pending → processing → complete | failed"""

    estimated_band: Mapped[Decimal | None] = mapped_column(Numeric(3, 1))
    """Populated after AI scoring completes. Null until then."""

    scoring_model: Mapped[str | None] = mapped_column(Text)
    """Which LLM generated the band estimate (for cost auditing)."""

    celery_task_id: Mapped[str | None] = mapped_column(Text)
    """Celery task ID — useful for monitoring / manual retry."""

    error_message: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'processing', 'complete', 'failed')",
            name="check_mock_exam_attempt_status",
        ),
        CheckConstraint(
            "task_number BETWEEN 1 AND 8",
            name="check_mock_exam_task_number",
        ),
        # Fast lookup: results page needs all tasks for a session
        Index("idx_mock_exam_session", "session_id"),
        # Composite: quota / history per user
        Index("idx_mock_exam_user_session", "user_id", "session_id"),
    )
