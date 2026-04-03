"""ORM model: learning_materials — reusable learning content records."""
import uuid
from datetime import datetime
from sqlalchemy import Text, Integer, String, DateTime, CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class LearningMaterial(Base, TimestampMixin):
    __tablename__ = "learning_materials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    material_type: Mapped[str] = mapped_column(String(32), nullable=False)
    module: Mapped[str] = mapped_column(String(16), nullable=False)
    skill: Mapped[str | None] = mapped_column(String(16))
    body_markdown: Mapped[str | None] = mapped_column(Text)
    body_json: Mapped[dict | None] = mapped_column(JSONB)
    primary_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_assets.id", ondelete="SET NULL")
    )
    difficulty: Mapped[str | None] = mapped_column(String(8))
    estimated_read_minutes: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="draft")
    version_no: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "material_type IN ('article','tip_sheet','sample_response','template',"
            "'vocabulary_set','grammar_note','drill','mock_support','file_based')",
            name="check_material_type",
        ),
        CheckConstraint("module IN ('speaking','writing','general')", name="check_material_module"),
        CheckConstraint("status IN ('draft','published','archived')", name="check_material_status"),
    )
