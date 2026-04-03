"""ORM model: speaking_prompt_images — map images to speaking prompts."""
import uuid
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, CheckConstraint, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SpeakingPromptImage(Base):
    __tablename__ = "speaking_prompt_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    speaking_prompt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("speaking_prompts.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_assets.id", ondelete="CASCADE"), nullable=False
    )
    image_role: Mapped[str] = mapped_column(String(16), nullable=False, server_default="primary")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "image_role IN ('primary','secondary','reference')",
            name="check_image_role",
        ),
    )
