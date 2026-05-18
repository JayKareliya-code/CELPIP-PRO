"""Retry credit pool: users.retry_credits_balance + retry_credit_ledger

Introduces a single per-user retry-credit pool used to redo practice attempts
and retake mock tests. Free plan = 0 credits (cannot retry). Pro plan = a
one-time grant at activation (PRO_RETRY_CREDITS_GRANT). Add-on purchases top
up the pool. See app.services.retry_credit_service for the access layer.

Schema only — app is in dev mode, so no addon-credit backfill is required.

Revision ID: 0021_retry_credits
Revises: 0020_mock_exam_unique_task
Create Date: 2026-05-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0021_retry_credits"
down_revision: Union[str, None] = "0020_mock_exam_unique_task"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users.retry_credits_balance ──────────────────────────────────────────
    op.add_column(
        "users",
        sa.Column(
            "retry_credits_balance",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_check_constraint(
        "check_retry_credits_non_negative",
        "users",
        "retry_credits_balance >= 0",
    )

    # ── retry_credit_ledger ──────────────────────────────────────────────────
    op.create_table(
        "retry_credit_ledger",
        sa.Column("id",         sa.UUID(),     nullable=False),
        sa.Column("user_id",    sa.UUID(),     nullable=False),
        sa.Column("delta",      sa.Integer(),  nullable=False),
        sa.Column("reason",     sa.String(64), nullable=False),
        sa.Column("attempt_id", sa.UUID(),     nullable=True),
        sa.Column("source_ref", sa.String(128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE",
            name="fk_retry_ledger_user",
        ),
        sa.CheckConstraint("delta != 0", name="check_retry_ledger_delta_non_zero"),
    )
    op.create_index(
        "idx_retry_ledger_user_created",
        "retry_credit_ledger",
        ["user_id", "created_at"],
    )
    op.create_index(
        "idx_retry_ledger_source_ref",
        "retry_credit_ledger",
        ["source_ref"],
    )


def downgrade() -> None:
    op.drop_index("idx_retry_ledger_source_ref",   table_name="retry_credit_ledger")
    op.drop_index("idx_retry_ledger_user_created", table_name="retry_credit_ledger")
    op.drop_table("retry_credit_ledger")

    op.drop_constraint("check_retry_credits_non_negative", "users", type_="check")
    op.drop_column("users", "retry_credits_balance")
