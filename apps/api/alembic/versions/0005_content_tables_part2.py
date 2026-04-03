"""Admin CMS Phase B (part 2) — content_tag_links, learning_material_task_links,
content_access_rules, content_versions, admin_audit_logs.

Revision: 0005
Depends on: 0004
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

_ENTITY_CHECK = "entity_type IN ('speaking_prompt','writing_prompt','learning_material')"


def upgrade() -> None:
    # ── content_tag_links ────────────────────────────────────────────────────
    op.create_table(
        "content_tag_links",
        sa.Column("id",          postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tag_id",      postgresql.UUID(as_uuid=True), sa.ForeignKey("content_tags.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_type", sa.String(24), nullable=False),
        sa.Column("entity_id",   postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(_ENTITY_CHECK, name="check_tag_link_entity"),
    )
    op.create_index("idx_content_tag_links_entity", "content_tag_links", ["entity_type", "entity_id"])
    op.create_index("idx_content_tag_links_tag",    "content_tag_links", ["tag_id"])

    # ── learning_material_task_links ─────────────────────────────────────────
    op.create_table(
        "learning_material_task_links",
        sa.Column("id",          postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("material_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("learning_materials.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill",       sa.String(16), nullable=False),
        sa.Column("task_number", sa.Integer(),  nullable=False),
        sa.Column("sort_order",  sa.Integer(),  nullable=False, server_default="0"),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("material_id", "skill", "task_number", name="uq_material_task_link"),
        sa.CheckConstraint("skill IN ('speaking','writing')", name="check_task_link_skill"),
    )
    op.create_index("idx_material_task_links_task", "learning_material_task_links", ["skill", "task_number"])

    # ── content_access_rules ─────────────────────────────────────────────────
    op.create_table(
        "content_access_rules",
        sa.Column("id",             postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("entity_type",    sa.String(24), nullable=False),
        sa.Column("entity_id",      postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("starter_access", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("pro_access",     sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("ultra_access",   sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("requires_addon", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("addon_code",     sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(_ENTITY_CHECK, name="check_access_rule_entity"),
    )
    op.create_index("idx_content_access_rules_entity", "content_access_rules", ["entity_type", "entity_id"])

    # ── content_versions ─────────────────────────────────────────────────────
    op.create_table(
        "content_versions",
        sa.Column("id",            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("entity_type",   sa.String(24), nullable=False),
        sa.Column("entity_id",     postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_no",    sa.Integer(),  nullable=False),
        sa.Column("snapshot_json", postgresql.JSONB(), nullable=False),
        sa.Column("changed_by",    postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("change_note",   sa.Text()),
        sa.Column("created_at",    sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("entity_type", "entity_id", "version_no", name="uq_content_version"),
        sa.CheckConstraint(_ENTITY_CHECK, name="check_version_entity"),
    )
    op.create_index("idx_content_versions_entity", "content_versions", ["entity_type", "entity_id"])

    # ── admin_audit_logs ─────────────────────────────────────────────────────
    op.create_table(
        "admin_audit_logs",
        sa.Column("id",            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("admin_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action_type",   sa.Text(), nullable=False),
        sa.Column("entity_type",   sa.Text(), nullable=False),
        sa.Column("entity_id",     postgresql.UUID(as_uuid=True)),
        sa.Column("old_value_json", postgresql.JSONB()),
        sa.Column("new_value_json", postgresql.JSONB()),
        sa.Column("metadata_json",  postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_audit_logs_admin",   "admin_audit_logs", ["admin_user_id"])
    op.create_index("idx_audit_logs_entity",  "admin_audit_logs", ["entity_type", "entity_id"])
    op.create_index("idx_audit_logs_created", "admin_audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("admin_audit_logs")
    op.drop_table("content_versions")
    op.drop_table("content_access_rules")
    op.drop_table("learning_material_task_links")
    op.drop_table("content_tag_links")
