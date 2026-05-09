import uuid
from sqlalchemy import CheckConstraint, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Subscription(Base, TimestampMixin):
    """One row per successful Stripe payment that upgraded a user's plan.

    ``stripe_payment_intent_id`` is the Stripe PaymentIntent ID (checkout
    mode="payment").  ``payment_type='cart'`` means the session contained
    multiple line items; ``'one_time'`` means a single-plan purchase.

    The ``charge.refunded`` webhook sets status='refunded' and downgrades the
    user back to 'starter'.
    """

    __tablename__ = "subscriptions"

    id:                        Mapped[uuid.UUID]  = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id:                   Mapped[uuid.UUID]  = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stripe_payment_intent_id:  Mapped[str | None] = mapped_column(String, unique=True)
    stripe_customer_id:        Mapped[str | None] = mapped_column(String)
    plan:                      Mapped[str]        = mapped_column(String, nullable=False)
    status:                    Mapped[str]        = mapped_column(String, nullable=False, default="active")
    payment_type:              Mapped[str]        = mapped_column(String, nullable=False, default="one_time")

    __table_args__ = (
        CheckConstraint("plan IN ('pro')",                              name="check_sub_plan"),
        CheckConstraint("status IN ('active', 'refunded', 'disputed')", name="check_sub_status"),
        CheckConstraint("payment_type IN ('one_time', 'cart')",         name="check_sub_payment_type"),
        Index("idx_subscriptions_user_id",        "user_id"),
        Index("idx_subscriptions_payment_intent", "stripe_payment_intent_id"),
    )
