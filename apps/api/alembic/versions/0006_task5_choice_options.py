"""Task 5 — Comparing & Persuading: add choice_options, curveball_option,
curveball_instruction_text, and default_choice_index columns to speaking_prompts.

Revision: 0006
Depends on: 0005
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # JSONB column: the two initial option cards shown during the PREP phase
    op.add_column(
        "speaking_prompts",
        sa.Column("choice_options", postgresql.JSONB(), nullable=True),
    )
    # JSONB column: the curveball (surprise third option) revealed at RECORDING phase
    op.add_column(
        "speaking_prompts",
        sa.Column("curveball_option", postgresql.JSONB(), nullable=True),
    )
    # Text: instruction banner shown on the curveball screen
    # e.g. "She has suddenly taken an interest in Photography. Convince her that your choice is better."
    op.add_column(
        "speaking_prompts",
        sa.Column("curveball_instruction_text", sa.Text(), nullable=True),
    )
    # Integer: 0 = Option A, 1 = Option B — admin preview default / scoring reference
    op.add_column(
        "speaking_prompts",
        sa.Column("default_choice_index", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("speaking_prompts", "default_choice_index")
    op.drop_column("speaking_prompts", "curveball_instruction_text")
    op.drop_column("speaking_prompts", "curveball_option")
    op.drop_column("speaking_prompts", "choice_options")
