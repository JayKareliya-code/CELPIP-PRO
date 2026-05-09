from __future__ import annotations

import uuid
from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AddonCredit(Base, TimestampMixin):
    """Tracks purchased addon practice credits and their consumption.

    One row is created per (addon_type, task_key) scope per Stripe PaymentIntent.
    The webhook handler expands module-level packs into one row per task:

        writing_pack  qty=N  → 2 rows  (writing-task-1, writing-task-2),   credits_total = N * 5
        speaking_pack qty=N  → 8 rows  (speaking-task-1 … speaking-task-8), credits_total = N * 5
        custom_bundle qty=N  → 1 row   (specific task_key),                 credits_total = N * 5
        mock_bundle   qty=N  → 2 rows  (mock-test-speaking-N, mock-test-writing-N),
                                        credits_total = 1 (one full mock exam slot)

    The quota enforcement layer reads credits_used vs credits_total when the
    user's plan-level quota is exhausted, then increments credits_used atomically
    (protected by the existing Postgres advisory lock in enforce_quota).
    """

    __tablename__ = "addon_credits"

    id:            Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id:       Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    stripe_pi_id:  Mapped[str]       = mapped_column(String, nullable=False)
    addon_type:    Mapped[str]       = mapped_column(String, nullable=False)
    task_key:      Mapped[str]       = mapped_column(String, nullable=False)
    credits_total: Mapped[int]       = mapped_column(Integer, nullable=False)
    credits_used:  Mapped[int]       = mapped_column(Integer, nullable=False, default=0)
    status:        Mapped[str]       = mapped_column(String, nullable=False, default="active")

    __table_args__ = (
        CheckConstraint(
            "addon_type IN ('writing_pack', 'speaking_pack', 'custom_bundle', 'mock_bundle')",
            name="check_addon_credit_type",
        ),
        CheckConstraint(
            "status IN ('active', 'refunded', 'exhausted')",
            name="check_addon_credit_status",
        ),
        CheckConstraint("credits_total > 0",                          name="check_addon_credit_total_positive"),
        CheckConstraint("credits_used >= 0",                          name="check_addon_credit_used_non_negative"),
        CheckConstraint("credits_used <= credits_total",              name="check_addon_credit_used_le_total"),
        Index("idx_addon_credits_user_id",        "user_id"),
        Index("idx_addon_credits_user_type_key",  "user_id", "addon_type", "task_key"),
        Index("idx_addon_credits_stripe_pi",      "stripe_pi_id"),
    )
