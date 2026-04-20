"""add_prompt_tag_to_speaking_prompts

Adds a prompt_tag column to speaking_prompts to distinguish between
prompts used in individual practice attempts ("practice") and prompts
used in full mock exam sessions ("mock").

Revision ID: 214da8c04f10
Revises: 0006
Create Date: 2026-04-10 16:49:10.084760

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "214da8c04f10"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add prompt_tag column with server default "practice" so all existing
    # rows are immediately valid without a data migration step.
    op.add_column(
        "speaking_prompts",
        sa.Column(
            "prompt_tag",
            sa.String(length=16),
            server_default="practice",
            nullable=False,
        ),
    )
    # Enforce the two allowed values at the DB level.
    op.create_check_constraint(
        "check_speaking_prompt_tag",
        "speaking_prompts",
        "prompt_tag IN ('practice', 'mock')",
    )


def downgrade() -> None:
    op.drop_constraint("check_speaking_prompt_tag", "speaking_prompts", type_="check")
    op.drop_column("speaking_prompts", "prompt_tag")
