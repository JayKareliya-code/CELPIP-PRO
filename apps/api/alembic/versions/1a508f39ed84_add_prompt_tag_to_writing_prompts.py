"""add_prompt_tag_to_writing_prompts

Revision ID: 1a508f39ed84
Revises: 207089dc77e0
Create Date: 2026-04-14 22:18:44

Adds ``prompt_tag`` column to ``writing_prompts`` table, mirroring the
column already present on ``speaking_prompts`` (migration 0008).

Values:
  "practice" (default) — served in individual task practice attempts
  "mock"               — served in full mock writing exam sessions only
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1a508f39ed84"
down_revision: Union[str, None] = "207089dc77e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add prompt_tag column — safe to run on existing data because of server_default
    op.add_column(
        "writing_prompts",
        sa.Column(
            "prompt_tag",
            sa.String(length=16),
            server_default="practice",
            nullable=False,
        ),
    )
    # Add check constraint matching the speaking_prompts one
    op.create_check_constraint(
        "check_writing_prompt_tag",
        "writing_prompts",
        "prompt_tag IN ('practice', 'mock')",
    )


def downgrade() -> None:
    op.drop_constraint("check_writing_prompt_tag", "writing_prompts", type_="check")
    op.drop_column("writing_prompts", "prompt_tag")
