import uuid
from sqlalchemy import String, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Subscription(Base, TimestampMixin):
    """Records a one-time Stripe payment that upgraded the user's plan.

    One row per successful purchase.  ``stripe_payment_intent_id`` is the
    Stripe PaymentIntent ID (not a Subscription object — we use one-time
    checkout mode).  The ``payment_type`` column documents that semantics
    choice explicitly so future add-on bundles can be added without ambiguity.

    The ``charge.refunded`` webhook sets status = 'refunded' and downgrades
    the user back to 'starter'.
    """
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # Renamed from stripe_subscription_id — we store a PaymentIntent ID because
    # checkout mode="payment" produces PaymentIntents, not Subscription objects.
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String, unique=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String)
    plan: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    payment_type: Mapped[str] = mapped_column(String, nullable=False, default="one_time")

    __table_args__ = (
        CheckConstraint("plan IN ('pro', 'ultra')", name="check_sub_plan"),
        CheckConstraint(
            "status IN ('active', 'refunded', 'disputed')",
            name="check_sub_status",
        ),
        CheckConstraint(
            "payment_type IN ('one_time')",
            name="check_sub_payment_type",
        ),
        Index("idx_subscriptions_user_id", "user_id"),
        Index("idx_subscriptions_payment_intent", "stripe_payment_intent_id"),
    )
