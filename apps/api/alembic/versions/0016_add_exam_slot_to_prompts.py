"""Add exam_slot column to speaking_prompts and writing_prompts.

exam_slot (nullable integer) assigns a mock prompt to a specific exam slot
(1, 2, …). NULL means the prompt has no slot assignment (practice prompts
or unassigned mock prompts). Only meaningful when prompt_tag = 'mock'.

Revision ID: 0016
Revises: 0015_score_schema_version
Create Date: 2026-05-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0016"
down_revision = "0015_score_schema_version"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "speaking_prompts",
        sa.Column("exam_slot", sa.Integer(), nullable=True),
    )
    op.add_column(
        "writing_prompts",
        sa.Column("exam_slot", sa.Integer(), nullable=True),
    )
    # Partial index: fast lookup for mock-exam prompt fetching by slot
    op.create_index(
        "ix_speaking_prompts_exam_slot",
        "speaking_prompts",
        ["exam_slot"],
        postgresql_where=sa.text("exam_slot IS NOT NULL"),
    )
    op.create_index(
        "ix_writing_prompts_exam_slot",
        "writing_prompts",
        ["exam_slot"],
        postgresql_where=sa.text("exam_slot IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_writing_prompts_exam_slot", table_name="writing_prompts")
    op.drop_index("ix_speaking_prompts_exam_slot", table_name="speaking_prompts")
    op.drop_column("writing_prompts", "exam_slot")
    op.drop_column("speaking_prompts", "exam_slot")
