"""merge_heads_0007_and_1a508f39ed84

Merges the two branch heads so alembic upgrade heads works cleanly.

Revision ID: 0008_merge_heads
Revises: 0007_add_mock_exam_number, 1a508f39ed84
Create Date: 2026-04-20

"""
from typing import Sequence, Union

revision: str = '0008_merge_heads'
down_revision: Union[str, tuple] = ('0007_add_mock_exam_number', '1a508f39ed84')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
