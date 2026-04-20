"""add_mock_exam_number_to_attempts

Tracks which test slot (1, 2, 3 …) a writing mock attempt belongs to.
Quota is counted as DISTINCT mock_exam_number, not total rows, so
re-doing the same slot never burns an extra quota unit.

Revision ID: 0007_add_mock_exam_number
Revises: 207089dc77e0
Create Date: 2026-04-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0007_add_mock_exam_number'
down_revision: Union[str, None] = '207089dc77e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # nullable — existing rows (practice + speaking mock) have no slot number
    op.add_column(
        'attempts',
        sa.Column('mock_exam_number', sa.Integer(), nullable=True),
    )
    op.create_index(
        'idx_attempts_writing_mock_slot',
        'attempts',
        ['user_id', 'skill', 'mock_exam_number'],
    )


def downgrade() -> None:
    op.drop_index('idx_attempts_writing_mock_slot', table_name='attempts')
    op.drop_column('attempts', 'mock_exam_number')
