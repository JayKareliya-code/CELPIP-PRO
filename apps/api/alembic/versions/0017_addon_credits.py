"""Add addon_credits table; fix ultra plan references in constraints.

- Creates the addon_credits table for tracking per-task practice credits
  purchased through the billing cart.
- Drops and recreates check_user_plan on users to remove 'ultra'.
- Drops and recreates check_sub_plan on subscriptions to remove 'ultra'.
- Adds 'cart' to check_sub_payment_type on subscriptions.

Revision ID: 0017_addon_credits
Revises: 214da8c04f10
Create Date: 2026-05-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision:      str                             = "0017_addon_credits"
down_revision: Union[str, Sequence[str], None] = ("0016", "214da8c04f10")
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── addon_credits ─────────────────────────────────────────────────────────

    op.create_table(
        "addon_credits",
        sa.Column("id",            sa.UUID(),    nullable=False),
        sa.Column("user_id",       sa.UUID(),    nullable=False),
        sa.Column("stripe_pi_id",  sa.String(),  nullable=False),
        sa.Column("addon_type",    sa.String(),  nullable=False),
        sa.Column("task_key",      sa.String(),  nullable=False),
        sa.Column("credits_total", sa.Integer(), nullable=False),
        sa.Column("credits_used",  sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status",        sa.String(),  nullable=False, server_default="active"),
        sa.Column("created_at",    sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at",    sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "addon_type IN ('writing_pack', 'speaking_pack', 'custom_bundle')",
            name="check_addon_credit_type",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'refunded', 'exhausted')",
            name="check_addon_credit_status",
        ),
        sa.CheckConstraint("credits_total > 0",             name="check_addon_credit_total_positive"),
        sa.CheckConstraint("credits_used >= 0",             name="check_addon_credit_used_non_negative"),
        sa.CheckConstraint("credits_used <= credits_total", name="check_addon_credit_used_le_total"),
    )

    op.create_index("idx_addon_credits_user_id",       "addon_credits", ["user_id"])
    op.create_index("idx_addon_credits_user_type_key", "addon_credits", ["user_id", "addon_type", "task_key"])
    op.create_index("idx_addon_credits_stripe_pi",     "addon_credits", ["stripe_pi_id"])

    # ── users: remove 'ultra' from plan constraint ────────────────────────────

    op.drop_constraint("check_user_plan", "users", type_="check")
    op.create_check_constraint(
        "check_user_plan",
        "users",
        "plan IN ('starter', 'pro')",
    )

    # ── subscriptions: remove 'ultra' from plan, add 'cart' to payment_type ──

    op.drop_constraint("check_sub_plan", "subscriptions", type_="check")
    op.create_check_constraint(
        "check_sub_plan",
        "subscriptions",
        "plan IN ('pro')",
    )

    op.drop_constraint("check_sub_payment_type", "subscriptions", type_="check")
    op.create_check_constraint(
        "check_sub_payment_type",
        "subscriptions",
        "payment_type IN ('one_time', 'cart')",
    )


def downgrade() -> None:
    # Restore subscriptions constraints
    op.drop_constraint("check_sub_payment_type", "subscriptions", type_="check")
    op.create_check_constraint(
        "check_sub_payment_type",
        "subscriptions",
        "payment_type IN ('one_time')",
    )

    op.drop_constraint("check_sub_plan", "subscriptions", type_="check")
    op.create_check_constraint(
        "check_sub_plan",
        "subscriptions",
        "plan IN ('pro', 'ultra')",
    )

    # Restore users constraint
    op.drop_constraint("check_user_plan", "users", type_="check")
    op.create_check_constraint(
        "check_user_plan",
        "users",
        "plan IN ('starter', 'pro', 'ultra')",
    )

    # Drop addon_credits
    op.drop_index("idx_addon_credits_stripe_pi",     table_name="addon_credits")
    op.drop_index("idx_addon_credits_user_type_key", table_name="addon_credits")
    op.drop_index("idx_addon_credits_user_id",       table_name="addon_credits")
    op.drop_table("addon_credits")
