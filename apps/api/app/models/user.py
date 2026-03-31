import uuid
from datetime import date
from sqlalchemy import Text, Date, Integer, Boolean, String, CheckConstraint, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    clerk_user_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(Text)
    plan: Mapped[str] = mapped_column(String, default="starter", nullable=False)
    
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_active_date: Mapped[date | None] = mapped_column(Date)
    target_band: Mapped[float | None] = mapped_column(Numeric(3, 1))
    
    __table_args__ = (
        CheckConstraint("plan IN ('starter', 'pro', 'ultra')", name="check_user_plan"),
    )
