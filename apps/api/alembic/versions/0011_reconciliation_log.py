"""Add reconciliation_runs table

Stores one row per nightly Stripe ↔ DB reconciliation run: how many paid
users were checked, how many corrections were made, and any fatal error.

Revision ID: 0011_reconciliation_log
Revises:     0010_subscription_semantics
Create Date: 2026-04-23
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_reconciliation_log"
down_revision: Union[str, None] = "0010_subscription_semantics"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reconciliation_runs",
        sa.Column("id", sa.UUID(), nullable=False, primary_key=True),
        sa.Column(
            "run_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("users_checked", sa.Integer(), nullable=False, default=0),
        sa.Column("corrections_made", sa.Integer(), nullable=False, default=0),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    # Index for admin queries: latest runs first
    op.create_index(
        "idx_reconciliation_runs_run_at",
        "reconciliation_runs",
        ["run_at"],
        postgresql_ops={"run_at": "DESC"},
    )


def downgrade() -> None:
    op.drop_index("idx_reconciliation_runs_run_at", table_name="reconciliation_runs")
    op.drop_table("reconciliation_runs")
