"""Admin asset service — register, confirm, and manage content assets."""
import os
import re
import uuid
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin_asset_repo import AdminAssetRepo
from app.services.admin_audit_service import log_action
from app.models.content_asset import ContentAsset
from app.core.config import settings
from app.services.storage.presigner import generate_presigned_upload, build_public_url


_ALLOWED_MIME_BY_TYPE = {
    "image": {"image/jpeg", "image/png", "image/webp", "image/gif"},
    "pdf":   {"application/pdf"},
    "doc":   {"application/msword",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    "audio": {"audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"},
    "video": {"video/mp4", "video/webm"},
}

# Flat set of every accepted MIME type, for O(1) allowlist checks.
_ALL_ALLOWED_MIMES = frozenset().union(*_ALLOWED_MIME_BY_TYPE.values())

# Storage keys for CMS uploads always live under this prefix.
_CMS_KEY_PREFIX = "cms/"

_SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]")


def _safe_filename(name: str) -> str:
    """Reduce a client-supplied filename to a safe S3 key segment.

    Strips any path components and replaces every character outside
    ``[A-Za-z0-9._-]`` so the filename cannot inject ``/`` or ``..`` into the
    storage key. Capped at 128 chars.
    """
    base = os.path.basename((name or "").strip())
    cleaned = _SAFE_FILENAME_RE.sub("_", base).lstrip(".")
    return (cleaned or "upload")[:128]


def infer_asset_type(mime_type: str) -> str:
    for asset_type, mimes in _ALLOWED_MIME_BY_TYPE.items():
        if mime_type in mimes:
            return asset_type
    return "other"


async def generate_upload_url(
    session: AsyncSession,  # noqa: ARG001 — kept for DI consistency
    filename: str,
    mime_type: str,
    title: str,
    admin_id: UUID,
) -> dict:
    """Return a presigned S3/R2 PUT URL plus the storage_key to confirm later.

    Rejects MIME types outside the allowlist and sanitises the client-supplied
    filename before it is embedded in the S3 key.
    """
    if mime_type not in _ALL_ALLOWED_MIMES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime_type!r}.")

    storage_key = f"{_CMS_KEY_PREFIX}{uuid.uuid4().hex}/{_safe_filename(filename)}"
    presigned_url = generate_presigned_upload(
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
    # Defence-in-depth: the client re-sends storage_key and mime_type here, so
    # re-validate both rather than trusting the confirm payload.
    if not storage_key.startswith(_CMS_KEY_PREFIX):
        raise HTTPException(
            status_code=400,
            detail=f"storage_key must be within the {_CMS_KEY_PREFIX!r} prefix.",
        )
    if mime_type not in _ALL_ALLOWED_MIMES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime_type!r}.")

    repo = AdminAssetRepo(session)
    asset_type = infer_asset_type(mime_type)
    public_url = build_public_url(storage_key)

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
