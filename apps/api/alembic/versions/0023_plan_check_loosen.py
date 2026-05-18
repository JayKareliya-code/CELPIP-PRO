"""Loosen users.plan and subscriptions.plan CHECK constraints

The old `plan IN ('starter','pro')` / `plan IN ('pro')` constraints required a
coordinated migration deploy whenever a new plan tier was introduced. A
mismatch between the code (which writes the new slug) and the DB (which rejects
it) sends the Stripe webhook into a permanent retry loop on a paid order.

The canonical allowlist now lives in `PLAN_PRICE_IDS` and is enforced by
`_normalize_plan_slug` at the webhook boundary. The DB constraint is downgraded
to a shape sanity check (not-null + length 1..32) so future plan tiers no
longer block on a constraint migration.

Revision ID: 0023_plan_check_loosen
Revises: 0022_addon_credit_unique
Create Date: 2026-05-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0023_plan_check_loosen"
down_revision: Union[str, None] = "0022_addon_credit_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("check_sub_plan", "subscriptions", type_="check")
    op.create_check_constraint(
        "check_sub_plan",
        "subscriptions",
        "plan IS NOT NULL AND length(plan) BETWEEN 1 AND 32",
    )

    op.drop_constraint("check_user_plan", "users", type_="check")
    op.create_check_constraint(
        "check_user_plan",
        "users",
        "plan IS NOT NULL AND length(plan) BETWEEN 1 AND 32",
    )


def downgrade() -> None:
    op.drop_constraint("check_user_plan", "users", type_="check")
    op.create_check_constraint(
        "check_user_plan",
        "users",
        "plan IN ('starter', 'pro')",
    )

    op.drop_constraint("check_sub_plan", "subscriptions", type_="check")
    op.create_check_constraint(
        "check_sub_plan",
        "subscriptions",
        "plan IN ('pro')",
    )
