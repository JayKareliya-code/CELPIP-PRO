import uuid
from sqlalchemy import Integer, Text, ForeignKey, Boolean, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Attempt(Base, TimestampMixin):
    """Parent attempt record — shared across speaking and writing."""
    __tablename__ = "attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    skill: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    task_number: Mapped[int] = mapped_column(Integer, nullable=False)
    # -1 sentinel means this is a full mock test, not a per-task practice attempt
    is_mock_test: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # For writing mock exams: which test slot (1, 2, 3 …) this attempt belongs to.
    # Quota is counted as DISTINCT mock_exam_number — re-doing the same slot is free.
    mock_exam_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="pending", index=True, nullable=False)
    celery_task_id: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        CheckConstraint("skill IN ('speaking', 'writing')", name="check_attempt_skill"),
        CheckConstraint(
            "status IN ('pending', 'processing', 'complete', 'failed', 'cancelled')",
            name="check_attempt_status",
        ),
        Index("idx_attempts_quota", "user_id", "skill", "task_number"),
        Index("idx_attempts_mock", "user_id", "skill", "is_mock_test"),
        Index("idx_attempts_writing_mock_slot", "user_id", "skill", "mock_exam_number"),
    )


class SpeakingAttempt(Base, TimestampMixin):
    """Speaking-specific attempt data."""
    __tablename__ = "speaking_attempts"

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attempts.id", ondelete="CASCADE"), primary_key=True
    )
    audio_s3_key: Mapped[str | None] = mapped_column(Text)
    audio_m4a_s3_key: Mapped[str | None] = mapped_column(Text)  # populated by transcode_audio_to_m4a (S2-7)
    audio_duration_ms: Mapped[int | None] = mapped_column(Integer)
    upload_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class WritingAttempt(Base, TimestampMixin):
    """Writing-specific attempt data."""
    __tablename__ = "writing_attempts"

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attempts.id", ondelete="CASCADE"), primary_key=True
    )
    essay_text: Mapped[str | None] = mapped_column(Text)
    word_count: Mapped[int | None] = mapped_column(Integer)
    char_count: Mapped[int | None] = mapped_column(Integer)
    auto_submitted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
