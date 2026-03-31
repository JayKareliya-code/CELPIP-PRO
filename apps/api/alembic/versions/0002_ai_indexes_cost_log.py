"""Alembic migration 0002 — Phase 2 indexes + ai_cost_log + new tables.

Revision: 0002
Depends on: 0001
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── New indexes on existing tables (Phase 2 access patterns) ─────────────

    # History page: fetch all attempts for a user, newest first
    op.create_index(
        "idx_attempts_user_created",
        "attempts",
        ["user_id", sa.text("created_at DESC")],
    )

    # ── transcripts ───────────────────────────────────────────────────────────
    op.create_table(
        "transcripts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attempts.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False, server_default="openai"),
        sa.Column("confidence_score", sa.Numeric(5, 4)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("idx_transcripts_attempt", "transcripts", ["attempt_id"])

    # ── score_reports ─────────────────────────────────────────────────────────
    op.create_table(
        "score_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attempts.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("estimated_band", sa.Numeric(4, 1), nullable=False),
        sa.Column("scoring_model", sa.Text(), nullable=False),
        sa.Column("raw_rubric_json", postgresql.JSONB()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("idx_score_reports_attempt", "score_reports", ["attempt_id"])

    # ── score_dimensions ──────────────────────────────────────────────────────
    op.create_table(
        "score_dimensions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "report_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("score_reports.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("dimension", sa.Text(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("max_score", sa.Integer(), nullable=False, server_default="12"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("idx_score_dimensions_report", "score_dimensions", ["report_id"])

    # ── feedback_reports ──────────────────────────────────────────────────────
    op.create_table(
        "feedback_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attempts.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "strengths",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "weaknesses",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "improvement_tips",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("sample_response", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("idx_feedback_reports_attempt", "feedback_reports", ["attempt_id"])

    # ── ai_cost_log ───────────────────────────────────────────────────────────
    op.create_table(
        "ai_cost_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column("operation", sa.Text(), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completion_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("estimated_cost_usd", sa.Numeric(10, 6)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("idx_ai_cost_attempt", "ai_cost_log", ["attempt_id"])
    op.create_index(
        "idx_ai_cost_created",
        "ai_cost_log",
        [sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("idx_ai_cost_created", table_name="ai_cost_log")
    op.drop_index("idx_ai_cost_attempt", table_name="ai_cost_log")
    op.drop_table("ai_cost_log")

    op.drop_index("idx_feedback_reports_attempt", table_name="feedback_reports")
    op.drop_table("feedback_reports")

    op.drop_index("idx_score_dimensions_report", table_name="score_dimensions")
    op.drop_table("score_dimensions")

    op.drop_index("idx_score_reports_attempt", table_name="score_reports")
    op.drop_table("score_reports")

    op.drop_index("idx_transcripts_attempt", table_name="transcripts")
    op.drop_table("transcripts")

    op.drop_index("idx_attempts_user_created", table_name="attempts")
