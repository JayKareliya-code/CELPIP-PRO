"""Add export_jobs table

Stores one row per user-initiated GDPR data export request.
Tracks status (pending → processing → complete | failed), the S3 download URL,
and a 24-hour expiry timestamp for the presigned URL.

Revision ID: 0012_export_jobs
Revises:     0011_reconciliation_log
Create Date: 2026-04-23
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0012_export_jobs"
down_revision: Union[str, None] = "0011_reconciliation_log"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "export_jobs",
        sa.Column("id", sa.UUID(), nullable=False, primary_key=True),
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(32),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("s3_url", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    # Fast lookup: user's export history sorted newest first
    op.create_index(
        "idx_export_jobs_user_created",
        "export_jobs",
        ["user_id", "created_at"],
        postgresql_ops={"created_at": "DESC"},
    )


def downgrade() -> None:
    op.drop_index("idx_export_jobs_user_created", table_name="export_jobs")
    op.drop_table("export_jobs")
