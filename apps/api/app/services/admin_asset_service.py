"""Admin asset service — register, confirm, and manage content assets."""
import hashlib
import uuid
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin_asset_repo import AdminAssetRepo
from app.services.admin_audit_service import log_action
from app.models.content_asset import ContentAsset
from app.core.config import settings


_ALLOWED_MIME_BY_TYPE = {
    "image": {"image/jpeg", "image/png", "image/webp", "image/gif"},
    "pdf":   {"application/pdf"},
    "doc":   {"application/msword",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    "audio": {"audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"},
    "video": {"video/mp4", "video/webm"},
}


def infer_asset_type(mime_type: str) -> str:
    for asset_type, mimes in _ALLOWED_MIME_BY_TYPE.items():
        if mime_type in mimes:
            return asset_type
    return "other"


async def generate_upload_url(
    session: AsyncSession,  # noqa: ARG001 — kept for dependency injection consistency
    filename: str,
    mime_type: str,
    title: str,
    admin_id: UUID,
) -> dict:
    """Return a presigned S3/R2 upload URL plus the storage_key to confirm later."""
    from app.services.storage.s3 import generate_presigned_upload  # lazy import

    storage_key = f"cms/{uuid.uuid4().hex}/{filename}"
    presigned_url = await generate_presigned_upload(
        bucket=settings.S3_BUCKET_NAME,
        key=storage_key,
        content_type=mime_type,
        expires_in=300,
    )
    return {"upload_url": presigned_url, "storage_key": storage_key}


async def confirm_asset(
    session: AsyncSession,
    *,
    storage_key: str,
    title: str,
    original_filename: str,
    mime_type: str,
    file_size_bytes: int | None,
    alt_text: str | None,
    caption: str | None,
    admin_id: UUID,
    width: int | None = None,
    height: int | None = None,
) -> ContentAsset:
    repo = AdminAssetRepo(session)
    asset_type = infer_asset_type(mime_type)
    base = settings.S3_ENDPOINT_URL or f"https://s3.{settings.S3_REGION}.amazonaws.com"
    public_url = f"{base}/{settings.S3_BUCKET_NAME}/{storage_key}"

    asset = await repo.create(
        asset_type=asset_type,
        title=title,
        original_filename=original_filename,
        mime_type=mime_type,
        storage_bucket=settings.S3_BUCKET_NAME,
        storage_key=storage_key,
        public_url=public_url,
        file_size_bytes=file_size_bytes,
        alt_text=alt_text,
        caption=caption,
        uploaded_by=admin_id,
        width=width,
        height=height,
    )
    await log_action(session, admin_user_id=admin_id, action_type="upload_asset",
                     entity_type="content_asset", entity_id=asset.id,
                     new_value={"storage_key": storage_key, "mime_type": mime_type})
    return asset


async def archive_asset(
    session: AsyncSession, asset: ContentAsset, admin_id: UUID
) -> ContentAsset:
    repo = AdminAssetRepo(session)
    updated = await repo.update(asset, status="archived")
    await log_action(session, admin_user_id=admin_id, action_type="archive_asset",
                     entity_type="content_asset", entity_id=updated.id)
    return updated
