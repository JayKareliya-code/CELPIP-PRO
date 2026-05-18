"""addon_credits: unique (stripe_pi_id, addon_type, task_key) for idempotent grants

A Stripe webhook re-delivery (e.g. an admin manual replay with a new event_id)
or a misbehaving cart that submits two equivalent line items could currently
double-grant addon credits. The stripe_events PK only guards against the SAME
event_id; nothing prevents a different event from re-inserting the same
(PI, addon, task) row.

This migration adds the (stripe_pi_id, addon_type, task_key) unique constraint
that the webhook now treats as an idempotency guard. The webhook also
aggregates duplicate cart segments before INSERT so the constraint is only
ever hit on a genuine replay.

Revision ID: 0022_addon_credit_unique
Revises: 0021_retry_credits
Create Date: 2026-05-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0022_addon_credit_unique"
down_revision: Union[str, None] = "0021_retry_credits"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_addon_credit_grant",
        "addon_credits",
        ["stripe_pi_id", "addon_type", "task_key"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_addon_credit_grant",
        "addon_credits",
        type_="unique",
    )
