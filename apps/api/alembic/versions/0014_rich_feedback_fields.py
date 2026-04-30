"""Rich feedback fields — JSONB + coaching columns on feedback_reports

Upgrades the feedback_reports table:
1. Converts strengths / weaknesses / improvement_tips from ARRAY(Text) to JSONB.
   Existing string-array rows are cast to JSONB arrays of strings, which the
   read-path guard in report_service handles gracefully as legacy format.
2. Adds next_milestone (Text, nullable) for the AI-generated next-step sentence.
3. Adds dimension_commentary (JSONB, nullable) for per-dimension score explanations.

Revision ID: 0014_rich_feedback_fields
Revises:     0013_audio_m4a_key, 214da8c04f10  (merges both open heads)
Create Date: 2026-04-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0014_rich_feedback_fields"
down_revision: Union[str, tuple] = ("0013_audio_m4a_key", "214da8c04f10")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Convert ARRAY(Text) columns to JSONB ──────────────────────────────
    # PostgreSQL requires dropping the old DEFAULT before changing the type,
    # because the default '{}' (empty text-array literal) cannot be automatically
    # cast to JSONB.  We then restore a valid JSONB empty-array default.
    for col in ("strengths", "weaknesses", "improvement_tips"):
        op.execute(
            f"ALTER TABLE feedback_reports ALTER COLUMN {col} DROP DEFAULT"
        )
        op.execute(
            f"ALTER TABLE feedback_reports "
            f"ALTER COLUMN {col} TYPE JSONB USING to_jsonb({col})"
        )
        op.execute(
            f"ALTER TABLE feedback_reports ALTER COLUMN {col} SET DEFAULT '[]'::jsonb"
        )

    # ── 2. Add new nullable coaching columns ─────────────────────────────────
    op.add_column(
        "feedback_reports",
        sa.Column("next_milestone", sa.Text(), nullable=True),
    )
    op.add_column(
        "feedback_reports",
        sa.Column("dimension_commentary", JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("feedback_reports", "dimension_commentary")
    op.drop_column("feedback_reports", "next_milestone")

    # Restore ARRAY(Text) — cast JSONB array back to text[]
    op.execute(
        "ALTER TABLE feedback_reports "
        "ALTER COLUMN improvement_tips TYPE TEXT[] "
        "USING ARRAY(SELECT jsonb_array_elements_text(improvement_tips))"
    )
    op.execute(
        "ALTER TABLE feedback_reports "
        "ALTER COLUMN weaknesses TYPE TEXT[] "
        "USING ARRAY(SELECT jsonb_array_elements_text(weaknesses))"
    )
    op.execute(
        "ALTER TABLE feedback_reports "
        "ALTER COLUMN strengths TYPE TEXT[] "
        "USING ARRAY(SELECT jsonb_array_elements_text(strengths))"
    )
