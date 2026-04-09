"""Admin CMS — speaking and writing prompt management endpoints."""
import uuid
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.deps import get_db
from app.core.config import settings
from app.core.security import require_admin
from app.models.user import User
from app.schemas.prompt import ChoiceOption
from app.repositories.admin_prompt_repo import AdminSpeakingPromptRepo, AdminWritingPromptRepo
import app.services.admin_prompt_service as svc
from app.api.v1._utils import to_dict
from app.services.storage.presigner import generate_presigned_upload, generate_presigned_get, build_public_url

router = APIRouter()
Admin = Annotated[User, Depends(require_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]


class SpeakingPromptIn(BaseModel):
    task_number: int = Field(ge=0, le=8)
    title: str
    prompt_text: str
    slug: str | None = None
    topic: str | None = None
    instructions_text: str | None = None
    context_image_url: str | None = None
    prep_time_seconds: int = 30
    response_time_seconds: int = 60
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    has_parts: bool = False
    part_count: int = 1
    vocabulary_tips: list[str] = []
    connector_phrases: list[str] = []
    template_hint: str | None = None
    sort_order: int = 0
    is_active: bool = True
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    # Stored in DB as sample_response_text; remapped in endpoint handlers
    sample_response_band12: str | None = None
    # ── Task 5 — Comparing & Persuading ──────────────────────────────────────
    # Fully typed — invalid option shapes return 422 with a clear error message.
    choice_options:             list[ChoiceOption] | None = None
    curveball_option:           ChoiceOption       | None = None
    curveball_instruction_text: str                | None = None
    default_choice_index:       int                | None = None


class SpeakingImageUploadIn(BaseModel):
    """Request body for the speaking prompt image presign endpoint."""
    task_number: int = Field(description="Must be 3, 4, or 8")
    filename:    str = Field(min_length=1, description="Original filename e.g. 'scene-001.jpg'")
    mime_type:   str = Field(description="MIME type e.g. 'image/jpeg'")


class Task5OptionImageUploadIn(BaseModel):
    """Request body for Task 5 option card image presign endpoint."""
    slot:      str = Field(description="'option-a', 'option-b', or 'curveball'")
    filename:  str = Field(min_length=1)
    mime_type: str


class WritingPromptIn(BaseModel):
    task_number: int = Field(ge=1, le=2)
    title: str
    prompt_text: str
    task_type: str
    slug: str | None = None
    topic: str | None = None
    instructions_text: str | None = None
    min_words: int
    max_words: int | None = None
    time_limit_seconds: int
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    idea_hints: list[str] = []
    intro_template: str | None = None
    conclusion_template: str | None = None
    sort_order: int = 0
    is_active: bool = True
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    # Stored in DB as sample_response_text; remapped in endpoint handlers
    sample_response_band12: str | None = None


def _remap(data: dict) -> dict:
    """Remap frontend field names to DB column names before calling the service.

    Also strips presign query params from context_image_url in case the frontend
    sends a signed URL instead of the clean path URL.  The DB must only store
    the clean s3-path URL (no X-Amz-* parameters).

    Task 5 invariant: has_parts and part_count are forced to True / 2 regardless of
    what the admin form sends — the two-phase speaking structure (RECORDING + RECORDING_PART2)
    requires has_parts=True for the state machine to route correctly.
    """
    if "sample_response_band12" in data:
        data["sample_response_text"] = data.pop("sample_response_band12")
    if url := data.get("context_image_url"):
        data["context_image_url"] = url.split("?")[0]
    # Task 5 invariant — enforce has_parts / part_count
    if data.get("task_number") == 5:
        data["has_parts"]  = True
        data["part_count"] = 2
    return data
# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_key(stored_url: str) -> str:
    """Extract the raw S3 key from a stored URL.

    Handles three formats:
      1. Raw key:         'speaking-task-3/uuid-file.jpg'
      2. Clean path URL:  'https://endpoint/bucket/speaking-task-3/uuid-file.jpg'
      3. Presigned URL:   'https://endpoint/bucket/key?X-Amz-Algorithm=...'
         (stored before stripPresign() was added to the frontend)

    Always strips query params so the returned value is a plain S3 key.
    """
    if not stored_url.startswith("http"):
        return stored_url.split("?")[0]  # strip any stray query params on raw keys
    marker = f"/{settings.S3_BUCKET_NAME}/"
    raw_key = stored_url.split(marker, 1)[-1] if marker in stored_url else stored_url
    return raw_key.split("?")[0]  # strip presign query params (X-Amz-*)


def _sign_dict(d: dict) -> dict:
    """Replace context_image_url with a 1-hour presigned GET URL in-place.

    Falls back silently to the raw stored URL if S3 is not configured
    (e.g. local dev without S3 credentials).
    """
    raw = d.get("context_image_url")
    if raw:
        try:
            d["context_image_url"] = generate_presigned_get(key=_extract_key(raw), expires_in=3600)
        except Exception:
            pass  # keep raw URL as fallback
    return d


# ── Speaking ───────────────────────────────────────────────────────────────────

@router.get("/speaking-prompts")
async def list_speaking(
    db: DB, _: Admin,
    status: str | None = None,
    task_number: int | None = None,
    search: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
) -> list[dict[str, Any]]:
    items = await AdminSpeakingPromptRepo(db).list_cms(
        status=status, task_number=task_number, search=search, limit=limit, offset=offset
    )
    return [_sign_dict(to_dict(r)) for r in items]


@router.post("/speaking-prompts/image-upload-url")
async def speaking_image_upload_url(
    body: SpeakingImageUploadIn,
    _admin: Admin,
) -> dict[str, Any]:
    """
    Return a presigned S3 PUT URL for a speaking task scene image.

    Flow:
      1. Admin picks a file in the UI
      2. UI calls this endpoint → gets { upload_url, public_url }
      3. UI PUTs the file body directly to upload_url (no server involvement)
      4. UI stores public_url as context_image_url in the prompt form

    S3 key format: speaking-task-{task_number}/{uuid}-{filename}
    This creates one folder per task in S3 for easy navigation.

    Only tasks 3, 4, 8 accept scene images.
    Only image/* MIME types are accepted.
    """
    _IMAGE_TASKS = {3, 4, 8}
    _ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

    if body.task_number not in _IMAGE_TASKS:
        raise HTTPException(
            status_code=422,
            detail=f"Task {body.task_number} is not an image-based task. "
                   f"Only tasks 3, 4, and 8 use scene images.",
        )
    if body.mime_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported image type '{body.mime_type}'. "
                   f"Accepted: jpeg, png, webp, gif.",
        )

    # Sanitise filename: strip path components, replace spaces
    safe_name = body.filename.rsplit("/", 1)[-1].replace(" ", "_")
    s3_key = f"speaking-task-{body.task_number}/{uuid.uuid4().hex}-{safe_name}"

    upload_url  = generate_presigned_upload(key=s3_key, content_type=body.mime_type, expires_in=300)
    public_url  = build_public_url(s3_key)          # stored in DB as context_image_url
    preview_url = generate_presigned_get(key=s3_key, expires_in=3600)  # browser-displayable, 1 h

    return {
        "upload_url":  upload_url,
        "public_url":  public_url,
        "preview_url": preview_url,   # use THIS for <img src> — works regardless of bucket ACL
        "s3_key":      s3_key,
    }


@router.get("/speaking-prompts/{prompt_id}/image-preview")
async def speaking_image_preview(
    prompt_id: uuid.UUID,
    db: DB,
    _admin: Admin,
) -> dict[str, Any]:
    """
    Return a fresh presigned GET URL for the scene image of an existing prompt.

    Call this when loading the edit form so the image preview works even when
    the bucket is not publicly accessible.  The URL is valid for 1 hour.
    """
    prompt = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not prompt:
        raise HTTPException(404, "Prompt not found")
    if not prompt.context_image_url:
        raise HTTPException(404, "This prompt has no scene image")

    return {"preview_url": generate_presigned_get(
        key=_extract_key(prompt.context_image_url), expires_in=3600,
    )}


@router.post("/speaking-prompts/task5-option-image-upload-url")
async def task5_option_image_upload_url(
    body: Task5OptionImageUploadIn,
    _admin: Admin,
) -> dict[str, Any]:
    """
    Return a presigned S3 PUT URL for a Task 5 option card image.

    Each option card (Option A, Option B, Curveball) can have its own image.
    The returned public_url is stored inside the choice_options / curveball_option JSONB
    as the 'image_url' key.

    S3 key format: speaking-task-5/{slot}/{uuid}-{filename}
    Valid slots: 'option-a', 'option-b', 'curveball'
    """
    _VALID_SLOTS = {"option-a", "option-b", "curveball"}
    _ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

    if body.slot not in _VALID_SLOTS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid slot '{body.slot}'. Must be one of: {', '.join(sorted(_VALID_SLOTS))}.",
        )
    if body.mime_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported image type '{body.mime_type}'. Accepted: jpeg, png, webp, gif.",
        )

    safe_name   = body.filename.rsplit("/", 1)[-1].replace(" ", "_")
    s3_key      = f"speaking-task-5/{body.slot}/{uuid.uuid4().hex}-{safe_name}"

    upload_url  = generate_presigned_upload(key=s3_key, content_type=body.mime_type, expires_in=300)
    public_url  = build_public_url(s3_key)
    preview_url = generate_presigned_get(key=s3_key, expires_in=3600)

    return {
        "upload_url":  upload_url,
        "public_url":  public_url,
        "preview_url": preview_url,
        "s3_key":      s3_key,
    }


@router.post("/speaking-prompts", status_code=201)
async def create_speaking(body: SpeakingPromptIn, db: DB, admin: Admin) -> dict[str, Any]:
    p = await svc.create_speaking(db, _remap(body.model_dump(exclude_none=True)), admin.id)
    await db.commit(); await db.refresh(p)
    return to_dict(p)


@router.get("/speaking-prompts/{prompt_id}")
async def get_speaking(prompt_id: uuid.UUID, db: DB, _: Admin) -> dict[str, Any]:
    p = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Speaking prompt not found")
    return _sign_dict(to_dict(p))


@router.patch("/speaking-prompts/{prompt_id}")
async def update_speaking(prompt_id: uuid.UUID, body: SpeakingPromptIn, db: DB, admin: Admin) -> dict[str, Any]:
    repo = AdminSpeakingPromptRepo(db)
    p = await repo.get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Speaking prompt not found")
    # exclude_unset (not exclude_none) so an admin can explicitly clear nullable
    # fields like context_image_url by sending null — exclude_none would silently
    # drop the null and leave the old value in the DB.
    updated = await svc.update_speaking(db, p, _remap(body.model_dump(exclude_unset=True)), admin.id)
    await db.commit(); await db.refresh(updated)
    return to_dict(updated)


@router.post("/speaking-prompts/{prompt_id}/publish")
async def publish_speaking(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    p = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Speaking prompt not found")
    u = await svc.publish_speaking(db, p, admin.id); await db.commit()
    return {"status": u.status}


@router.post("/speaking-prompts/{prompt_id}/archive")
async def archive_speaking(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    p = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Speaking prompt not found")
    u = await svc.archive_speaking(db, p, admin.id); await db.commit()
    return {"status": u.status}


@router.post("/speaking-prompts/{prompt_id}/clone", status_code=201)
async def clone_speaking(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    src = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not src: raise HTTPException(404, "Speaking prompt not found")
    cloned = await svc.clone_speaking(db, src, admin.id)
    await db.commit(); await db.refresh(cloned)
    return to_dict(cloned)


@router.post("/speaking-prompts/{prompt_id}/toggle-active")
async def toggle_active_speaking(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    """Toggle is_active for a speaking prompt without touching any other field.

    Using a dedicated endpoint instead of PATCH prevents accidental corruption
    of fields like context_image_url or status when the frontend only intends
    to flip a single boolean.
    """
    repo = AdminSpeakingPromptRepo(db)
    p = await repo.get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Speaking prompt not found")
    updated = await repo.update(p, is_active=not p.is_active, updated_by=admin.id)
    await db.commit()
    return {"id": str(updated.id), "is_active": updated.is_active}



# ── Writing ───────────────────────────────────────────────────────────────────

@router.get("/writing-prompts")
async def list_writing(
    db: DB, _: Admin,
    status: str | None = None,
    task_number: int | None = None,
    search: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
) -> list[dict[str, Any]]:
    items = await AdminWritingPromptRepo(db).list_cms(
        status=status, task_number=task_number, search=search, limit=limit, offset=offset
    )
    return [to_dict(r) for r in items]


@router.post("/writing-prompts", status_code=201)
async def create_writing(body: WritingPromptIn, db: DB, admin: Admin) -> dict[str, Any]:
    p = await svc.create_writing(db, _remap(body.model_dump(exclude_none=True)), admin.id)
    await db.commit(); await db.refresh(p)
    return to_dict(p)


@router.patch("/writing-prompts/{prompt_id}")
async def update_writing(prompt_id: uuid.UUID, body: WritingPromptIn, db: DB, admin: Admin) -> dict[str, Any]:
    repo = AdminWritingPromptRepo(db)
    p = await repo.get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Writing prompt not found")
    updated = await svc.update_writing(db, p, _remap(body.model_dump(exclude_none=True)), admin.id)
    await db.commit(); await db.refresh(updated)
    return to_dict(updated)


@router.post("/writing-prompts/{prompt_id}/publish")
async def publish_writing(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    p = await AdminWritingPromptRepo(db).get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Writing prompt not found")
    u = await svc.publish_writing(db, p, admin.id); await db.commit()
    return {"status": u.status}


@router.post("/writing-prompts/{prompt_id}/archive")
async def archive_writing(prompt_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    p = await AdminWritingPromptRepo(db).get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Writing prompt not found")
    u = await svc.archive_writing(db, p, admin.id); await db.commit()
    return {"status": u.status}


@router.delete("/speaking-prompts/{prompt_id}", status_code=204)
async def delete_speaking(prompt_id: uuid.UUID, db: DB, _: Admin) -> None:
    """Hard-delete a speaking prompt. Prefer archive for prompts that have been used."""
    p = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Speaking prompt not found")
    await db.delete(p)
    await db.commit()


@router.delete("/writing-prompts/{prompt_id}", status_code=204)
async def delete_writing(prompt_id: uuid.UUID, db: DB, _: Admin) -> None:
    """Hard-delete a writing prompt. Prefer archive for prompts that have been used."""
    p = await AdminWritingPromptRepo(db).get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Writing prompt not found")
    await db.delete(p)
    await db.commit()

