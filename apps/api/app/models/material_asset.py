"""ORM model: material_assets — attach multiple assets to one learning material."""
import uuid
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, CheckConstraint, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MaterialAsset(Base):
    __tablename__ = "material_assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("learning_materials.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_assets.id", ondelete="CASCADE"), nullable=False
    )
    asset_role: Mapped[str] = mapped_column(String(16), nullable=False, server_default="attachment")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "asset_role IN ('cover','attachment','inline','thumbnail','reference')",
            name="check_asset_role",
        ),
    )
