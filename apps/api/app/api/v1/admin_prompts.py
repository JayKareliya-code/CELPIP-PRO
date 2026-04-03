"""Admin CMS — speaking and writing prompt management endpoints."""
import uuid
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.deps import get_db
from app.core.security import require_admin
from app.models.user import User
from app.repositories.admin_prompt_repo import AdminSpeakingPromptRepo, AdminWritingPromptRepo
import app.services.admin_prompt_service as svc
from app.api.v1._utils import to_dict

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


# ── Speaking ──────────────────────────────────────────────────────────────────

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
    return [to_dict(r) for r in items]


@router.post("/speaking-prompts", status_code=201)
async def create_speaking(body: SpeakingPromptIn, db: DB, admin: Admin) -> dict[str, Any]:
    p = await svc.create_speaking(db, body.model_dump(exclude_none=True), admin.id)
    await db.commit(); await db.refresh(p)
    return to_dict(p)


@router.get("/speaking-prompts/{prompt_id}")
async def get_speaking(prompt_id: uuid.UUID, db: DB, _: Admin) -> dict[str, Any]:
    p = await AdminSpeakingPromptRepo(db).get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Speaking prompt not found")
    return to_dict(p)


@router.patch("/speaking-prompts/{prompt_id}")
async def update_speaking(prompt_id: uuid.UUID, body: SpeakingPromptIn, db: DB, admin: Admin) -> dict[str, Any]:
    repo = AdminSpeakingPromptRepo(db)
    p = await repo.get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Speaking prompt not found")
    updated = await svc.update_speaking(db, p, body.model_dump(exclude_none=True), admin.id)
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
    p = await svc.create_writing(db, body.model_dump(exclude_none=True), admin.id)
    await db.commit(); await db.refresh(p)
    return to_dict(p)


@router.patch("/writing-prompts/{prompt_id}")
async def update_writing(prompt_id: uuid.UUID, body: WritingPromptIn, db: DB, admin: Admin) -> dict[str, Any]:
    repo = AdminWritingPromptRepo(db)
    p = await repo.get_by_id(prompt_id)
    if not p: raise HTTPException(404, "Writing prompt not found")
    updated = await svc.update_writing(db, p, body.model_dump(exclude_none=True), admin.id)
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
