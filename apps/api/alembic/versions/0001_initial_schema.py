"""Initial schema — all Phase 1 tables.

Revision: 0001
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("clerk_user_id", sa.Text(), unique=True, nullable=False),
        sa.Column("email", sa.Text(), unique=True, nullable=False),
        sa.Column("full_name", sa.Text()),
        sa.Column("plan", sa.String(16), nullable=False, server_default="starter"),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("streak_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_active_date", sa.Date()),
        sa.Column("target_band", sa.Numeric(3, 1)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("plan IN ('starter','pro','ultra')", name="check_user_plan"),
    )
    op.create_index("idx_users_clerk_id", "users", ["clerk_user_id"], unique=True)

    # ── speaking_prompts ─────────────────────────────────────────────────────
    op.create_table(
        "speaking_prompts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("task_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("context_image_url", sa.Text()),
        sa.Column("prep_time_seconds", sa.Integer(), nullable=False),
        sa.Column("response_time_seconds", sa.Integer(), nullable=False),
        sa.Column("difficulty", sa.String(8), nullable=False, server_default="medium"),
        sa.Column("has_parts", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("part_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("sample_response_text", sa.Text()),
        sa.Column("vocabulary_tips", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("connector_phrases", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("template_hint", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("task_number BETWEEN 0 AND 8", name="check_speaking_task_number"),
        sa.CheckConstraint("difficulty IN ('easy','medium','hard')", name="check_speaking_difficulty"),
    )
    op.create_index("idx_speaking_prompts_task", "speaking_prompts", ["task_number"])

    # ── writing_prompts ──────────────────────────────────────────────────────
    op.create_table(
        "writing_prompts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("task_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("task_type", sa.Text(), nullable=False),
        sa.Column("min_words", sa.Integer(), nullable=False),
        sa.Column("max_words", sa.Integer()),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False),
        sa.Column("difficulty", sa.String(8), nullable=False, server_default="medium"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("sample_response_text", sa.Text()),
        sa.Column("idea_hints", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("intro_template", sa.Text()),
        sa.Column("conclusion_template", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("task_number IN (1,2)", name="check_writing_task_number"),
        sa.CheckConstraint("difficulty IN ('easy','medium','hard')", name="check_writing_difficulty"),
    )
    op.create_index("idx_writing_prompts_task", "writing_prompts", ["task_number"])

    # ── attempts ─────────────────────────────────────────────────────────────
    op.create_table(
        "attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill", sa.Text(), nullable=False),
        sa.Column("prompt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_number", sa.Integer(), nullable=False),
        sa.Column("is_mock_test", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("celery_task_id", sa.Text()),
        sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("skill IN ('speaking','writing')", name="check_attempt_skill"),
        sa.CheckConstraint(
            "status IN ('pending','processing','complete','failed','cancelled')",
            name="check_attempt_status",
        ),
    )
    op.create_index("idx_attempts_user_id", "attempts", ["user_id"])
    op.create_index("idx_attempts_status", "attempts", ["status"])
    op.create_index("idx_attempts_quota", "attempts", ["user_id", "skill", "task_number"])
    op.create_index("idx_attempts_mock", "attempts", ["user_id", "skill", "is_mock_test"])

    # ── speaking_attempts ────────────────────────────────────────────────────
    op.create_table(
        "speaking_attempts",
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("attempts.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("audio_s3_key", sa.Text()),
        sa.Column("audio_duration_ms", sa.Integer()),
        sa.Column("upload_completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── writing_attempts ─────────────────────────────────────────────────────
    op.create_table(
        "writing_attempts",
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("attempts.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("essay_text", sa.Text()),
        sa.Column("word_count", sa.Integer()),
        sa.Column("char_count", sa.Integer()),
        sa.Column("auto_submitted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── calibration_samples ──────────────────────────────────────────────────
    op.create_table(
        "calibration_samples",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("skill", sa.Text(), nullable=False),
        sa.Column("task_number", sa.Integer()),
        sa.Column("band_level", sa.Numeric(3, 1), nullable=False),
        sa.Column("sample_text", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False, server_default="official"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("skill IN ('speaking','writing')", name="check_calibration_skill"),
    )
    op.create_index("idx_calibration_skill_task", "calibration_samples", ["skill", "task_number"])

    # ── subscriptions ────────────────────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stripe_subscription_id", sa.Text(), unique=True),
        sa.Column("stripe_customer_id", sa.Text()),
        sa.Column("plan", sa.String(8), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True)),
        sa.Column("canceled_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("plan IN ('pro','ultra')", name="check_sub_plan"),
        sa.CheckConstraint(
            "status IN ('active','past_due','canceled','trialing','incomplete')",
            name="check_sub_status",
        ),
    )
    op.create_index("idx_subscriptions_user_id", "subscriptions", ["user_id"])


def downgrade() -> None:
    op.drop_table("subscriptions")
    op.drop_table("calibration_samples")
    op.drop_table("writing_attempts")
    op.drop_table("speaking_attempts")
    op.drop_table("attempts")
    op.drop_table("writing_prompts")
    op.drop_table("speaking_prompts")
    op.drop_table("users")
