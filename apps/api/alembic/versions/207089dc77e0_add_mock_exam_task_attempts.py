"""add_mock_exam_task_attempts

Revision ID: 207089dc77e0
Revises: 214da8c04f10
Create Date: 2026-04-10 17:43:51.465659

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '207089dc77e0'
down_revision: Union[str, None] = '214da8c04f10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'mock_exam_task_attempts',
        sa.Column('id',                sa.Uuid(),             nullable=False),
        sa.Column('session_id',        sa.Text(),             nullable=False),
        sa.Column('user_id',           sa.Uuid(),             nullable=False),
        sa.Column('task_number',       sa.Integer(),          nullable=False),
        sa.Column('audio_s3_key',      sa.Text(),             nullable=False),
        sa.Column('audio_duration_ms', sa.Integer(),          nullable=True),
        sa.Column('status',            sa.Text(),             nullable=False),
        sa.Column('estimated_band',    sa.Numeric(3, 1),      nullable=True),
        sa.Column('scoring_model',     sa.Text(),             nullable=True),
        sa.Column('celery_task_id',    sa.Text(),             nullable=True),
        sa.Column('error_message',     sa.Text(),             nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'processing', 'complete', 'failed')",
            name='check_mock_exam_attempt_status',
        ),
        sa.CheckConstraint(
            'task_number BETWEEN 1 AND 8',
            name='check_mock_exam_task_number',
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_mock_exam_session',      'mock_exam_task_attempts', ['session_id'],             unique=False)
    op.create_index('idx_mock_exam_user_session', 'mock_exam_task_attempts', ['user_id', 'session_id'],  unique=False)
    op.create_index('ix_mock_exam_task_attempts_session_id', 'mock_exam_task_attempts', ['session_id'],  unique=False)
    op.create_index('ix_mock_exam_task_attempts_status',     'mock_exam_task_attempts', ['status'],       unique=False)
    op.create_index('ix_mock_exam_task_attempts_user_id',    'mock_exam_task_attempts', ['user_id'],      unique=False)


def downgrade() -> None:
    op.drop_index('ix_mock_exam_task_attempts_user_id',    table_name='mock_exam_task_attempts')
    op.drop_index('ix_mock_exam_task_attempts_status',     table_name='mock_exam_task_attempts')
    op.drop_index('ix_mock_exam_task_attempts_session_id', table_name='mock_exam_task_attempts')
    op.drop_index('idx_mock_exam_user_session',            table_name='mock_exam_task_attempts')
    op.drop_index('idx_mock_exam_session',                 table_name='mock_exam_task_attempts')
    op.drop_table('mock_exam_task_attempts')
