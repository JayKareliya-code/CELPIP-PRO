"""Subscription table semantics: one-time payment columns

Renames stripe_subscription_id -> stripe_payment_intent_id (semantically
correct for checkout mode="payment"), drops unused recurring-subscription
columns (current_period_end, canceled_at), and adds payment_type column.
Updates the status check constraint to reflect real one-time payment states.

Revision ID: 0010_subscription_semantics
Revises: 0009_stripe_events_and_tos
Create Date: 2026-04-22
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_subscription_semantics"
down_revision: Union[str, None] = "0009_stripe_events_and_tos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename stripe_subscription_id → stripe_payment_intent_id
    op.alter_column(
        "subscriptions",
        "stripe_subscription_id",
        new_column_name="stripe_payment_intent_id",
        existing_type=sa.String(),
        existing_nullable=True,
    )

    # 2. Drop columns that only make sense for recurring Stripe Subscriptions
    op.drop_column("subscriptions", "current_period_end")
    op.drop_column("subscriptions", "canceled_at")

    # 3. Add payment_type to document one-time vs future bundle semantics
    op.add_column(
        "subscriptions",
        sa.Column(
            "payment_type",
            sa.String(length=32),
            nullable=False,
            server_default="one_time",
        ),
    )

    # 4. Update status check constraint to real one-time payment states
    op.drop_constraint("check_sub_status", "subscriptions", type_="check")
    op.create_check_constraint(
        "check_sub_status",
        "subscriptions",
        "status IN ('active', 'refunded', 'disputed')",
    )

    # 5. Add check constraint for payment_type
    op.create_check_constraint(
        "check_sub_payment_type",
        "subscriptions",
        "payment_type IN ('one_time')",
    )

    # 6. Add index on stripe_payment_intent_id for refund handler lookups
    op.create_index(
        "idx_subscriptions_payment_intent",
        "subscriptions",
        ["stripe_payment_intent_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_subscriptions_payment_intent", table_name="subscriptions")
    op.drop_constraint("check_sub_payment_type", "subscriptions", type_="check")
    op.drop_constraint("check_sub_status", "subscriptions", type_="check")
    op.create_check_constraint(
        "check_sub_status",
        "subscriptions",
        "status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')",
    )
    op.drop_column("subscriptions", "payment_type")
    op.add_column(
        "subscriptions",
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "subscriptions",
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column(
        "subscriptions",
        "stripe_payment_intent_id",
        new_column_name="stripe_subscription_id",
        existing_type=sa.String(),
        existing_nullable=True,
    )
