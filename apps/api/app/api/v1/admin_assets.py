"""Admin CMS — asset upload, confirmation, and management endpoints."""
import uuid
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.deps import get_db
from app.api.v1._utils import to_dict
from app.core.security import require_admin
from app.models.user import User
from app.repositories.admin_asset_repo import AdminAssetRepo
import app.services.admin_asset_service as svc
from app.services.admin_audit_service import log_action

router = APIRouter()
Admin = Annotated[User, Depends(require_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]


class UploadUrlRequest(BaseModel):
    filename: str
    mime_type: str
    title: str


class ConfirmUploadRequest(BaseModel):
    storage_key: str
    title: str
    original_filename: str
    mime_type: str
    file_size_bytes: int | None = None
    alt_text: str | None = None
    caption: str | None = None
    width: int | None = None
    height: int | None = None


class AssetPatch(BaseModel):
    title: str | None = None
    alt_text: str | None = None
    caption: str | None = None


class PromptImageIn(BaseModel):
    asset_id: uuid.UUID
    image_role: str = "primary"
    sort_order: int = 0


@router.post("/assets/upload-url")
async def get_upload_url(body: UploadUrlRequest, db: DB, admin: Admin) -> dict[str, Any]:
    return await svc.generate_upload_url(db, body.filename, body.mime_type, body.title, admin.id)


@router.post("/assets/confirm", status_code=201)
async def confirm_asset(body: ConfirmUploadRequest, db: DB, admin: Admin) -> dict[str, Any]:
    asset = await svc.confirm_asset(db, **body.model_dump(), admin_id=admin.id)
    await db.commit()
    await db.refresh(asset)
    return to_dict(asset)


@router.get("/assets")
async def list_assets(
    db: DB, _: Admin,
    asset_type: str | None = None,
    status: str = "active",
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    repo = AdminAssetRepo(db)
    items = await repo.list_cms(asset_type=asset_type, status=status, limit=limit, offset=offset)
    return [to_dict(row) for row in items]


@router.get("/assets/{asset_id}")
async def get_asset(asset_id: uuid.UUID, db: DB, _: Admin) -> dict[str, Any]:
    repo = AdminAssetRepo(db)
    asset = await repo.get_by_id(asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    return to_dict(asset)


@router.patch("/assets/{asset_id}")
async def patch_asset(asset_id: uuid.UUID, body: AssetPatch, db: DB, admin: Admin) -> dict[str, Any]:
    repo = AdminAssetRepo(db)
    asset = await repo.get_by_id(asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    payload = body.model_dump(exclude_none=True)
    updated = await repo.update(asset, **payload)
    await log_action(db, admin_user_id=admin.id, action_type="update",
                     entity_type="asset", entity_id=asset_id, new_value=payload)
    await db.commit()
    await db.refresh(updated)
    return to_dict(updated)


@router.post("/assets/{asset_id}/archive")
async def archive_asset(asset_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    repo = AdminAssetRepo(db)
    asset = await repo.get_by_id(asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    updated = await svc.archive_asset(db, asset, admin.id)
    await db.commit()
    return {"status": updated.status}


@router.get("/speaking-prompts/{prompt_id}/images")
async def get_prompt_images(prompt_id: uuid.UUID, db: DB, _: Admin) -> list[dict[str, Any]]:
    repo = AdminAssetRepo(db)
    images = await repo.get_prompt_images(prompt_id)
    return [to_dict(img) for img in images]


@router.post("/speaking-prompts/{prompt_id}/images", status_code=201)
async def add_prompt_image(
    prompt_id: uuid.UUID, body: PromptImageIn, db: DB, admin: Admin
) -> dict[str, Any]:
    repo = AdminAssetRepo(db)
    img = await repo.add_prompt_image(
        prompt_id, body.asset_id, body.image_role, body.sort_order
    )
    await log_action(db, admin_user_id=admin.id, action_type="add_image",
                     entity_type="speaking_prompt", entity_id=prompt_id,
                     new_value=body.model_dump(mode="json"))
    await db.commit()
    return to_dict(img)


@router.delete("/speaking-prompts/{prompt_id}/images/{image_id}", status_code=204)
async def remove_prompt_image(
    prompt_id: uuid.UUID, image_id: uuid.UUID, db: DB, admin: Admin
) -> None:
    repo = AdminAssetRepo(db)
    removed = await repo.remove_prompt_image(image_id)
    if not removed:
        raise HTTPException(404, "Image mapping not found")
    await log_action(db, admin_user_id=admin.id, action_type="remove_image",
                     entity_type="speaking_prompt", entity_id=prompt_id,
                     old_value={"image_id": str(image_id)})
    await db.commit()
