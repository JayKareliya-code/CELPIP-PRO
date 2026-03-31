import uuid
from sqlalchemy import Integer, String, Boolean, Text, ARRAY, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin

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

    __table_args__ = (
        CheckConstraint("task_number BETWEEN 0 AND 8", name="check_speaking_task_number"),
        CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name="check_speaking_difficulty"),
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

    __table_args__ = (
        CheckConstraint("task_number IN (1, 2)", name="check_writing_task_number"),
        CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name="check_writing_difficulty"),
    )
