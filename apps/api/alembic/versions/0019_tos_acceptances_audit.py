"""tos_acceptances audit table

Creates an append-only table to store every Terms-of-Service acceptance event
with the user's IP address, user-agent, accepted version, and a server-side
UTC timestamp.  Used as legal evidence of consent under Quebec's Law 25.

Revision ID: 0019_tos_acceptances_audit
Revises: 0018_mock_bundle
Create Date: 2026-05-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0019_tos_acceptances_audit"
down_revision: Union[str, None] = "0018_mock_bundle"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tos_acceptances",
        sa.Column(
            "id",
            sa.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tos_version", sa.String(length=32), nullable=False),
        sa.Column(
            "accepted_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
    )

    # Index for per-user history queries
    op.create_index("idx_tos_acceptances_user_id", "tos_acceptances", ["user_id"])
    # Index to find all users who accepted a specific version
    op.create_index("idx_tos_acceptances_version", "tos_acceptances", ["tos_version"])


def downgrade() -> None:
    op.drop_index("idx_tos_acceptances_version",  table_name="tos_acceptances")
    op.drop_index("idx_tos_acceptances_user_id",  table_name="tos_acceptances")
    op.drop_table("tos_acceptances")
