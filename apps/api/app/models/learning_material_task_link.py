"""ORM model: learning_material_task_links — connect materials to tasks."""
import uuid
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, CheckConstraint, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class LearningMaterialTaskLink(Base):
    __tablename__ = "learning_material_task_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("learning_materials.id", ondelete="CASCADE"), nullable=False
    )
    skill: Mapped[str] = mapped_column(String(16), nullable=False)
    task_number: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("skill IN ('speaking','writing')", name="check_task_link_skill"),
    )
