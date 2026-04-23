"""
StripeEvent — idempotency guard for Stripe webhook deliveries.

Stripe retries delivery on any non-2xx response and can occasionally deliver
the same event twice even on 2xx. Processing a `checkout.session.completed`
twice would flip `user.plan` repeatedly and insert duplicate Subscription
rows. We guarantee at-most-once side effects by inserting the event_id into
this table (UNIQUE) inside the same transaction as the business-logic
mutations. A duplicate delivery hits the unique constraint and we short-circuit.
"""
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StripeEvent(Base):
    __tablename__ = "stripe_events"

    event_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="processed"
    )
    error_message: Mapped[str | None] = mapped_column(Text)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
