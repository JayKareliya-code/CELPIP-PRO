"""stripe_events table + tos_accepted_at on users

Adds:
- stripe_events (event_id PK) for webhook idempotency
- users.tos_accepted_at and users.tos_version for Terms-of-Service tracking

Revision ID: 0009_stripe_events_and_tos
Revises: 0008_merge_heads
Create Date: 2026-04-22
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_stripe_events_and_tos"
down_revision: Union[str, None] = "0008_merge_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stripe_events",
        sa.Column("event_id", sa.String(length=255), primary_key=True),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column(
            "status", sa.String(length=32), nullable=False, server_default="processed"
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_stripe_events_event_type", "stripe_events", ["event_type"]
    )

    op.add_column(
        "users",
        sa.Column("tos_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("tos_version", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "tos_version")
    op.drop_column("users", "tos_accepted_at")
    op.drop_index("idx_stripe_events_event_type", table_name="stripe_events")
    op.drop_table("stripe_events")
