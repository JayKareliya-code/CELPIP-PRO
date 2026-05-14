"""Unique constraint on mock_exam_task_attempts (user_id, session_id, task_number)

Makes the mock-exam confirm-upload endpoint idempotent: a double-click can no
longer create duplicate attempt rows (and duplicate AI-scoring jobs) for the
same task slot. An explicit redo still works — the route reuses the existing
row instead of inserting a new one.

Any pre-existing duplicate rows are collapsed to the most recent row before the
constraint is added so the migration cannot fail on dirty data.

Revision ID: 0020_mock_exam_unique_task
Revises: 0019_tos_acceptances_audit
Create Date: 2026-05-14
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0020_mock_exam_unique_task"
down_revision: Union[str, None] = "0019_tos_acceptances_audit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Collapse any existing duplicates, keeping the most recently created row
    # for each (user_id, session_id, task_number) tuple.
    op.execute(
        """
        DELETE FROM mock_exam_task_attempts
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY user_id, session_id, task_number
                           ORDER BY created_at DESC, id DESC
                       ) AS rn
                FROM mock_exam_task_attempts
            ) ranked
            WHERE ranked.rn > 1
        )
        """
    )

    op.create_unique_constraint(
        "uq_mock_exam_user_session_task",
        "mock_exam_task_attempts",
        ["user_id", "session_id", "task_number"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_mock_exam_user_session_task",
        "mock_exam_task_attempts",
        type_="unique",
    )
