"""ORM model: content_access_rules — plan/add-on gating per content item."""
import uuid
from datetime import datetime
from sqlalchemy import Text, Boolean, String, DateTime, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

_ENTITY_CHECK = "entity_type IN ('speaking_prompt','writing_prompt','learning_material')"


class ContentAccessRule(Base):
    __tablename__ = "content_access_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(24), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    starter_access: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    pro_access: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    ultra_access: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    requires_addon: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    addon_code: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(_ENTITY_CHECK, name="check_access_rule_entity"),
    )
