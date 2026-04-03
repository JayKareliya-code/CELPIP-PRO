"""Admin CMS Phase B (part 1) — content_assets, learning_materials,
material_assets, speaking_prompt_images, content_tags.

Revision: 0004
Depends on: 0003
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── content_assets ───────────────────────────────────────────────────────
    op.create_table(
        "content_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_type", sa.String(16), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("storage_bucket", sa.Text(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False, unique=True),
        sa.Column("public_url", sa.Text()),
        sa.Column("thumbnail_url", sa.Text()),
        sa.Column("file_size_bytes", sa.BigInteger()),
        sa.Column("width", sa.Integer()),
        sa.Column("height", sa.Integer()),
        sa.Column("duration_seconds", sa.Integer()),
        sa.Column("checksum_sha256", sa.Text()),
        sa.Column("alt_text", sa.Text()),
        sa.Column("caption", sa.Text()),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("asset_type IN ('image','pdf','doc','audio','video','other')", name="check_asset_type"),
        sa.CheckConstraint("status IN ('active','archived','deleted')", name="check_asset_status"),
    )
    op.create_index("idx_content_assets_type",   "content_assets", ["asset_type"])
    op.create_index("idx_content_assets_status", "content_assets", ["status"])

    # ── learning_materials ───────────────────────────────────────────────────
    op.create_table(
        "learning_materials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug",    sa.Text(), nullable=False, unique=True),
        sa.Column("title",   sa.Text(), nullable=False),
        sa.Column("summary", sa.Text()),
        sa.Column("material_type", sa.String(32), nullable=False),
        sa.Column("module", sa.String(16), nullable=False),
        sa.Column("skill",  sa.String(16)),
        sa.Column("body_markdown", sa.Text()),
        sa.Column("body_json",     postgresql.JSONB()),
        sa.Column("primary_asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content_assets.id", ondelete="SET NULL")),
        sa.Column("difficulty", sa.String(8)),
        sa.Column("estimated_read_minutes", sa.Integer()),
        sa.Column("status",     sa.String(16), nullable=False, server_default="draft"),
        sa.Column("version_no", sa.Integer(),  nullable=False, server_default="1"),
        sa.Column("sort_order", sa.Integer(),  nullable=False, server_default="0"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("archived_at",  sa.DateTime(timezone=True)),
        sa.Column("created_at",   sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at",   sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("material_type IN ('article','tip_sheet','sample_response','template','vocabulary_set','grammar_note','drill','mock_support','file_based')", name="check_material_type"),
        sa.CheckConstraint("module IN ('speaking','writing','general')", name="check_material_module"),
        sa.CheckConstraint("status IN ('draft','published','archived')", name="check_material_status"),
    )
    op.create_index("idx_learning_materials_module", "learning_materials", ["module"])
    op.create_index("idx_learning_materials_status", "learning_materials", ["status"])

    # ── material_assets ──────────────────────────────────────────────────────
    op.create_table(
        "material_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("material_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("learning_materials.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_id",    postgresql.UUID(as_uuid=True), sa.ForeignKey("content_assets.id",    ondelete="CASCADE"), nullable=False),
        sa.Column("asset_role",  sa.String(16), nullable=False, server_default="attachment"),
        sa.Column("sort_order",  sa.Integer(),  nullable=False, server_default="0"),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("material_id", "asset_id", "asset_role", name="uq_material_asset_role"),
        sa.CheckConstraint("asset_role IN ('cover','attachment','inline','thumbnail','reference')", name="check_asset_role"),
    )
    op.create_index("idx_material_assets_material", "material_assets", ["material_id"])

    # ── speaking_prompt_images ───────────────────────────────────────────────
    op.create_table(
        "speaking_prompt_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("speaking_prompt_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_prompts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_id",   postgresql.UUID(as_uuid=True), sa.ForeignKey("content_assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_role", sa.String(16), nullable=False, server_default="primary"),
        sa.Column("sort_order", sa.Integer(),  nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("speaking_prompt_id", "asset_id", name="uq_speaking_prompt_asset"),
        sa.CheckConstraint("image_role IN ('primary','secondary','reference')", name="check_image_role"),
    )
    op.create_index("idx_speaking_prompt_images_prompt", "speaking_prompt_images", ["speaking_prompt_id"])

    # ── content_tags ─────────────────────────────────────────────────────────
    op.create_table(
        "content_tags",
        sa.Column("id",       postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name",     sa.Text(), nullable=False, unique=True),
        sa.Column("slug",     sa.Text(), nullable=False, unique=True),
        sa.Column("tag_type", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("tag_type IN ('topic','difficulty','grammar','vocabulary','module','general')", name="check_tag_type"),
    )


def downgrade() -> None:
    op.drop_table("content_tags")
    op.drop_table("speaking_prompt_images")
    op.drop_table("material_assets")
    op.drop_table("learning_materials")
    op.drop_table("content_assets")
