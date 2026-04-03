"""Admin CMS Phase A — extend speaking/writing prompts with CMS fields.

Adds: slug, topic, instructions_text, status, sort_order,
      version_no, created_by, updated_by, published_at, archived_at

Revision: 0003
Depends on: 0002
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

_STATUS_CHECK = "status IN ('draft','published','archived')"


def _add_cms_columns(table: str) -> None:
    op.add_column(table, sa.Column("slug", sa.Text()))
    op.add_column(table, sa.Column("topic", sa.Text()))
    op.add_column(table, sa.Column("instructions_text", sa.Text()))
    op.add_column(table, sa.Column(
        "status", sa.String(16), nullable=False, server_default="draft"
    ))
    op.add_column(table, sa.Column(
        "sort_order", sa.Integer(), nullable=False, server_default="0"
    ))
    op.add_column(table, sa.Column(
        "version_no", sa.Integer(), nullable=False, server_default="1"
    ))
    op.add_column(table, sa.Column(
        "created_by", postgresql.UUID(as_uuid=True),
        sa.ForeignKey("users.id", ondelete="SET NULL"),
    ))
    op.add_column(table, sa.Column(
        "updated_by", postgresql.UUID(as_uuid=True),
        sa.ForeignKey("users.id", ondelete="SET NULL"),
    ))
    op.add_column(table, sa.Column("published_at", sa.DateTime(timezone=True)))
    op.add_column(table, sa.Column("archived_at",  sa.DateTime(timezone=True)))


def _drop_cms_columns(table: str) -> None:
    for col in [
        "slug", "topic", "instructions_text", "status", "sort_order",
        "version_no", "created_by", "updated_by", "published_at", "archived_at",
    ]:
        op.drop_column(table, col)


def upgrade() -> None:
    # ── speaking_prompts ─────────────────────────────────────────────────────
    _add_cms_columns("speaking_prompts")
    op.create_unique_constraint("uq_speaking_prompts_slug", "speaking_prompts", ["slug"])
    op.create_index("idx_speaking_prompts_status", "speaking_prompts", ["status"])
    op.create_check_constraint(
        "check_speaking_status", "speaking_prompts", _STATUS_CHECK,
    )

    # ── writing_prompts ──────────────────────────────────────────────────────
    _add_cms_columns("writing_prompts")
    op.create_unique_constraint("uq_writing_prompts_slug", "writing_prompts", ["slug"])
    op.create_index("idx_writing_prompts_status", "writing_prompts", ["status"])
    op.create_check_constraint(
        "check_writing_status", "writing_prompts", _STATUS_CHECK,
    )


def downgrade() -> None:
    op.drop_constraint("check_writing_status",  "writing_prompts",  type_="check")
    op.drop_index("idx_writing_prompts_status",  table_name="writing_prompts")
    op.drop_constraint("uq_writing_prompts_slug", "writing_prompts",  type_="unique")
    _drop_cms_columns("writing_prompts")

    op.drop_constraint("check_speaking_status",  "speaking_prompts", type_="check")
    op.drop_index("idx_speaking_prompts_status", table_name="speaking_prompts")
    op.drop_constraint("uq_speaking_prompts_slug","speaking_prompts", type_="unique")
    _drop_cms_columns("speaking_prompts")
