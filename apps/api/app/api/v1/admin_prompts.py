"""Admin CMS — speaking and writing prompt management endpoints."""
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import require_admin
from app.models.user import User
from app.repositories.admin_prompt_repo import AdminSpeakingPromptRepo, AdminWritingPromptRepo
import app.services.admin_prompt_service as svc
from app.api.v1._utils import to_dict
from app.services.storage.presigner import generate_presigned_upload, generate_presigned_get, build_public_url

from app.api.v1._prompt_schemas import (
    SpeakingPromptIn,
    SpeakingPromptPatchIn,
    SpeakingImageUploadIn,
    Task5OptionImageUploadIn,
    WritingPromptIn,
    WritingPromptPatchIn,
)
from app.api.v1._prompt_helpers import extract_s3_key, remap_prompt_data, sign_prompt_dict

router = APIRouter()
Admin = Annotated[User, Depends(require_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]

_IMAGE_TASKS = {3, 4, 8}
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_VALID_TASK5_SLOTS = {"option-a", "option-b", "curveball"}


# ── Speaking ──────────────────────────────────────────────────────────────────

@router.get("/speaking-prompts")
async def list_speaking(
    db: DB, _: Admin,
    status: str | None = None,
    task_number: int | None = None,
    search: str | None = Query(None),
    limit: int = Query(500, le=500),
    offset: int = 0,
) -> list[dict[str, Any]]:
    items = await AdminSpeakingPromptRepo(db).list_cms(
        status=status, task_number=task_number, search=search, limit=limit, offset=offset
    )
    return [sign_prompt_dict(to_dict(r)) for r in items]


@router.post("/speaking-prompts/image-upload-url")
async def speaking_image_upload_url(
    body: SpeakingImageUploadIn,
    _admin: Admin,
) -> dict[str, Any]:
    """Return a presigned S3 PUT URL for a speaking task scene image (tasks 3, 4, 8)."""
    if body.task_number not in _IMAGE_TASKS:
        raise HTTPException(
            status_code=422,
            detail=f"Task {body.task_number} is not an image-based task. Only tasks 3, 4, and 8 use scene images.",
        )
    if body.mime_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported image type '{body.mime_type}'. Accepted: jpeg, png, webp, gif.",
        )

    safe_name = body.filename.rsplit("/", 1)[-1].replace(" ", "_")
    s3_key = f"speaking-task-{body.task_number}/{uuid.uuid4().hex}-{safe_name}"

    return {
        "upload_url":  generate_presigned_upload(key=s3_key, content_type=body.mime_type, expires_in=300),
        "public_url":  build_public_url(s3_key),
        "preview_url": generate_presigned_get(key=s3_key, expires_in=3600),
        "s3_key":      s3_key,
    }


@router.get("/speaking-prompts/{prompt_id}/image-preview")
async def speaking_image_preview(
    prompt_id: uuid.UUID,
    db: DB,
    _admin: Admin,
) -> dict[str, Any]:
    """Return a fresh presigned GET URL for the scene image of an existing prompt."""
    prompt = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not prompt:
        raise HTTPException(404, "Prompt not found")
    if not prompt.context_image_url:
        raise HTTPException(404, "This prompt has no scene image")

    return {"preview_url": generate_presigned_get(
        key=extract_s3_key(prompt.context_image_url), expires_in=3600,
    )}


@router.post("/speaking-prompts/task5-option-image-upload-url")
async def task5_option_image_upload_url(
    body: Task5OptionImageUploadIn,
    _admin: Admin,
) -> dict[str, Any]:
    """Return a presigned S3 PUT URL for a Task 5 option card image."""
    if body.slot not in _VALID_TASK5_SLOTS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid slot '{body.slot}'. Must be one of: {', '.join(sorted(_VALID_TASK5_SLOTS))}.",
        )
    if body.mime_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported image type '{body.mime_type}'. Accepted: jpeg, png, webp, gif.",
        )

    safe_name = body.filename.rsplit("/", 1)[-1].replace(" ", "_")
    s3_key = f"speaking-task-5/{body.slot}/{uuid.uuid4().hex}-{safe_name}"

    return {
        "upload_url":  generate_presigned_upload(key=s3_key, content_type=body.mime_type, expires_in=300),
        "public_url":  build_public_url(s3_key),
        "preview_url": generate_presigned_get(key=s3_key, expires_in=3600),
        "s3_key":      s3_key,
    }


@router.post("/speaking-prompts", status_code=201)
async def create_speaking(body: SpeakingPromptIn, db: DB, admin: Admin) -> dict[str, Any]:
    p = await svc.create_speaking(db, remap_prompt_data(body.model_dump(exclude_none=True)), admin.id)
    await db.commit()
    await db.refresh(p)
    return sign_prompt_dict(to_dict(p))


@router.get("/speaking-prompts/{prompt_id}")
async def get_speaking(prompt_id: uuid.UUID, db: DB, _: Admin) -> dict[str, Any]:
    p = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Speaking prompt not found")
    return sign_prompt_dict(to_dict(p))


@router.patch("/speaking-prompts/{prompt_id}")
async def update_speaking(prompt_id: uuid.UUID, body: SpeakingPromptPatchIn, db: DB, admin: Admin) -> dict[str, Any]:
    repo = AdminSpeakingPromptRepo(db)
    p = await repo.get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Speaking prompt not found")
    updated = await svc.update_speaking(db, p, remap_prompt_data(body.model_dump(exclude_unset=True)), admin.id)
    await db.commit()
    await db.refresh(updated)
    return sign_prompt_dict(to_dict(updated))


@router.post("/speaking-prompts/{prompt_id}/publish")
async def publish_speaking(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    p = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Speaking prompt not found")
    u = await svc.publish_speaking(db, p, admin.id)
    await db.commit()
    return {"status": u.status}


@router.post("/speaking-prompts/{prompt_id}/archive")
async def archive_speaking(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    p = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Speaking prompt not found")
    u = await svc.archive_speaking(db, p, admin.id)
    await db.commit()
    return {"status": u.status}


@router.post("/speaking-prompts/{prompt_id}/clone", status_code=201)
async def clone_speaking(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    src = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not src:
        raise HTTPException(404, "Speaking prompt not found")
    cloned = await svc.clone_speaking(db, src, admin.id)
    await db.commit()
    await db.refresh(cloned)
    return to_dict(cloned)


@router.post("/speaking-prompts/{prompt_id}/toggle-active")
async def toggle_active_speaking(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    """Toggle is_active for a speaking prompt without touching any other field."""
    repo = AdminSpeakingPromptRepo(db)
    p = await repo.get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Speaking prompt not found")
    updated = await repo.update(p, is_active=not p.is_active, updated_by=admin.id)
    await db.commit()
    return {"id": str(updated.id), "is_active": updated.is_active}


@router.delete("/speaking-prompts/{prompt_id}", status_code=204)
async def delete_speaking(prompt_id: uuid.UUID, db: DB, _: Admin) -> None:
    """Hard-delete a speaking prompt. Prefer archive for prompts that have been used."""
    p = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Speaking prompt not found")
    await db.delete(p)
    await db.commit()


# ── Writing ───────────────────────────────────────────────────────────────────

@router.get("/writing-prompts")
async def list_writing(
    db: DB, _: Admin,
    status: str | None = None,
    task_number: int | None = None,
    search: str | None = Query(None),
    limit: int = Query(500, le=500),
    offset: int = 0,
) -> list[dict[str, Any]]:
    items = await AdminWritingPromptRepo(db).list_cms(
        status=status, task_number=task_number, search=search, limit=limit, offset=offset
    )
    return [to_dict(r) for r in items]


@router.post("/writing-prompts", status_code=201)
async def create_writing(body: WritingPromptIn, db: DB, admin: Admin) -> dict[str, Any]:
    p = await svc.create_writing(db, remap_prompt_data(body.model_dump(exclude_none=True)), admin.id)
    await db.commit()
    await db.refresh(p)
    return to_dict(p)


@router.patch("/writing-prompts/{prompt_id}")
async def update_writing(prompt_id: uuid.UUID, body: WritingPromptPatchIn, db: DB, admin: Admin) -> dict[str, Any]:
    repo = AdminWritingPromptRepo(db)
    p = await repo.get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Writing prompt not found")
    updated = await svc.update_writing(db, p, remap_prompt_data(body.model_dump(exclude_unset=True)), admin.id)
    await db.commit()
    await db.refresh(updated)
    return to_dict(updated)


@router.post("/writing-prompts/{prompt_id}/publish")
async def publish_writing(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    p = await AdminWritingPromptRepo(db).get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Writing prompt not found")
    u = await svc.publish_writing(db, p, admin.id)
    await db.commit()
    return {"status": u.status}


@router.post("/writing-prompts/{prompt_id}/archive")
async def archive_writing(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    p = await AdminWritingPromptRepo(db).get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Writing prompt not found")
    u = await svc.archive_writing(db, p, admin.id)
    await db.commit()
    return {"status": u.status}


@router.post("/writing-prompts/{prompt_id}/toggle-active")
async def toggle_active_writing(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    """Toggle is_active for a writing prompt without touching any other field."""
    repo = AdminWritingPromptRepo(db)
    p = await repo.get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Writing prompt not found")
    updated = await repo.update(p, is_active=not p.is_active, updated_by=admin.id)
    await db.commit()
    return {"id": str(updated.id), "is_active": updated.is_active}


@router.delete("/writing-prompts/{prompt_id}", status_code=204)
async def delete_writing(prompt_id: uuid.UUID, db: DB, _: Admin) -> None:
    """Hard-delete a writing prompt. Prefer archive for prompts that have been used."""
    p = await AdminWritingPromptRepo(db).get_by_id(prompt_id)
    if not p:
        raise HTTPException(404, "Writing prompt not found")
    await db.delete(p)
    await db.commit()

