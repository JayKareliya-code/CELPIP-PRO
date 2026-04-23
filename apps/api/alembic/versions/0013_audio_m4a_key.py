"""Add audio_m4a_s3_key columns for iOS audio compatibility

Adds audio_m4a_s3_key to speaking_attempts and mock_exam_task_attempts.
The transcode_audio_to_m4a Celery task populates this column after converting
the original .webm recording to .m4a (AAC) for Safari / iOS playback.

When the column is populated, the reports endpoint prefers the .m4a presigned
URL over the .webm one. Falls back to .webm if transcoding has not completed.

Revision ID: 0013_audio_m4a_key
Revises:     0012_export_jobs
Create Date: 2026-04-23
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013_audio_m4a_key"
down_revision: Union[str, None] = "0012_export_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "speaking_attempts",
        sa.Column("audio_m4a_s3_key", sa.String(512), nullable=True),
    )
    op.add_column(
        "mock_exam_task_attempts",
        sa.Column("audio_m4a_s3_key", sa.String(512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("mock_exam_task_attempts", "audio_m4a_s3_key")
    op.drop_column("speaking_attempts", "audio_m4a_s3_key")
