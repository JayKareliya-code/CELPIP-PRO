import uuid
from datetime import datetime
from sqlalchemy import Integer, String, Boolean, Text, ARRAY, CheckConstraint, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin

_CMS_STATUS_CHECK = "status IN ('draft','published','archived')"


class SpeakingPrompt(Base, TimestampMixin):
    __tablename__ = "speaking_prompts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    task_number: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    context_image_url: Mapped[str | None] = mapped_column(Text)
    prep_time_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    response_time_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, default="medium", nullable=False)
    has_parts: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    part_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sample_response_text: Mapped[str | None] = mapped_column(Text)
    vocabulary_tips: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    connector_phrases: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    template_hint: Mapped[str | None] = mapped_column(Text)

    # Task 5 — Comparing & Persuading fields (migration 0006)
    # choice_options: list of two option cards shown during the PREP (selection) phase
    # Shape: [{"name": "Hairdressing", "details": [{"label": "Schedule", "value": "Morning classes"}, ...]}, ...]
    choice_options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # curveball_option: the surprise third option revealed at the RECORDING (prep) phase
    # Shape: {"name": "Photography", "details": [{"label": "Study mode", "value": "Online"}, ...]}
    curveball_option: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # curveball_instruction_text: instruction banner shown at top of the curveball screen
    # e.g. "She has suddenly taken an interest in Photography. Convince her that your choice is better."
    curveball_instruction_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # default_choice_index: 0 or 1 — which choice is pre-selected for admin preview / scoring reference
    default_choice_index: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # CMS fields (migration 0003)
    slug: Mapped[str | None] = mapped_column(Text, unique=True)
    topic: Mapped[str | None] = mapped_column(Text)
    instructions_text: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="draft")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    version_no: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("task_number BETWEEN 0 AND 8", name="check_speaking_task_number"),
        CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name="check_speaking_difficulty"),
        CheckConstraint(_CMS_STATUS_CHECK, name="check_speaking_status"),
    )


class WritingPrompt(Base, TimestampMixin):
    __tablename__ = "writing_prompts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    task_number: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    task_type: Mapped[str] = mapped_column(Text, nullable=False)
    min_words: Mapped[int] = mapped_column(Integer, nullable=False)
    max_words: Mapped[int | None] = mapped_column(Integer)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, default="medium", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sample_response_text: Mapped[str | None] = mapped_column(Text)
    idea_hints: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    intro_template: Mapped[str | None] = mapped_column(Text)
    conclusion_template: Mapped[str | None] = mapped_column(Text)

    # CMS fields (migration 0003)
    slug: Mapped[str | None] = mapped_column(Text, unique=True)
    topic: Mapped[str | None] = mapped_column(Text)
    instructions_text: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="draft")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    version_no: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("task_number IN (1, 2)", name="check_writing_task_number"),
        CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name="check_writing_difficulty"),
        CheckConstraint(_CMS_STATUS_CHECK, name="check_writing_status"),
    )
