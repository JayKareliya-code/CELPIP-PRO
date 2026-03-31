import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, CheckConstraint, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Subscription(Base, TimestampMixin):
    """Stripe subscription stub — wired for real in Phase 3."""
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(String, unique=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String)
    plan: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("plan IN ('pro', 'ultra')", name="check_sub_plan"),
        CheckConstraint(
            "status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')",
            name="check_sub_status",
        ),
        Index("idx_subscriptions_user_id", "user_id"),
    )
