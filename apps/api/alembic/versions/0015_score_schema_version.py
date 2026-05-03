"""Add schema_version and likely_range to score_reports

Adds:
  - score_reports.schema_version (INTEGER, default 1) — identifies which
    dimension model was used to produce this score:
      v1 = legacy 5-dimension model (task_completion/coherence/fluency/grammar
           for speaking; task_fulfillment/organization/tone_register/grammar for writing)
      v2 = official CELPIP 4-dimension model (content_coherence/vocabulary/
           listenability/task_fulfillment for speaking;
           content_coherence/vocabulary/readability/task_fulfillment for writing)
  - score_reports.likely_range (VARCHAR(10), nullable) — official CELPIP output
    format band range string, e.g. "7-8" or "9-10". NULL for v1 legacy scores.

Existing score_reports rows are left intact with schema_version=1 (the default).
New attempts scored after this migration will use schema_version=2.

Revision ID: 0015_score_schema_version
Revises:     0014_rich_feedback_fields
Create Date: 2026-05-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015_score_schema_version"
down_revision: Union[str, tuple] = "0014_rich_feedback_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # schema_version: 1 = legacy 5-dimension, 2 = official CELPIP 4-dimension
    op.add_column(
        "score_reports",
        sa.Column(
            "schema_version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )
    # likely_range: e.g. "7-8", "9-10" — populated only by v2 scoring
    op.add_column(
        "score_reports",
        sa.Column(
            "likely_range",
            sa.String(length=10),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("score_reports", "likely_range")
    op.drop_column("score_reports", "schema_version")
