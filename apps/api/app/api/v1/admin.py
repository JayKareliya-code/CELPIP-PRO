"""Admin routes — prompt management and calibration samples.

All endpoints require is_admin=True (enforced by require_admin dependency).
"""
import uuid
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.deps import get_db
from app.core.security import require_admin
from app.models.user import User
from app.models.calibration import CalibrationSample
from app.repositories.prompt_repo import SpeakingPromptRepository, WritingPromptRepository
from app.repositories.base import BaseRepository
from app.schemas.prompt import SpeakingTaskResponse, WritingTaskResponse

router = APIRouter()


# ── Admin prompt schemas (create/update) ──────────────────────────────────────

class SpeakingPromptCreate(BaseModel):
    task_number: int = Field(ge=0, le=8)
    title: str
    prompt_text: str
    context_image_url: str | None = None
    prep_time_seconds: int = Field(gt=0)
    response_time_seconds: int = Field(gt=0)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    has_parts: bool = False
    part_count: int = Field(default=1, ge=1)
    vocabulary_tips: list[str] = []
    connector_phrases: list[str] = []
    template_hint: str | None = None
    sample_response_text: str | None = None


class SpeakingPromptUpdate(SpeakingPromptCreate):
    """Reuse create schema for PUT (all fields replaceable)."""


class WritingPromptCreate(BaseModel):
    task_number: int = Field(ge=1, le=2)
    title: str
    prompt_text: str
    task_type: str
    min_words: int = Field(gt=0)
    max_words: int | None = None
    time_limit_seconds: int = Field(gt=0)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    idea_hints: list[str] = []
    intro_template: str | None = None
    conclusion_template: str | None = None
    sample_response_text: str | None = None


class WritingPromptUpdate(WritingPromptCreate):
    """Reuse create schema for PUT."""


class CalibrationCreate(BaseModel):
    skill: str = Field(pattern="^(speaking|writing)$")
    task_number: int | None = None
    band_level: float = Field(ge=1.0, le=12.0)
    sample_text: str
    source: str = "official"


# ── Speaking prompt admin endpoints ───────────────────────────────────────────

@router.get("/prompts/speaking", response_model=list[SpeakingTaskResponse])
async def admin_list_speaking(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> list[SpeakingTaskResponse]:
    """Return ALL speaking prompts including inactive ones."""
    prompts = await SpeakingPromptRepository(db).list_all_admin()
    return [SpeakingTaskResponse.model_validate(p) for p in prompts]


@router.post("/prompts/speaking", response_model=SpeakingTaskResponse, status_code=201)
async def admin_create_speaking(
    body: SpeakingPromptCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> SpeakingTaskResponse:
    """Create a new speaking prompt."""
    repo = SpeakingPromptRepository(db)
    prompt = await repo.create(**body.model_dump())
    return SpeakingTaskResponse.model_validate(prompt)


@router.put("/prompts/speaking/{prompt_id}", response_model=SpeakingTaskResponse)
async def admin_update_speaking(
    prompt_id: uuid.UUID,
    body: SpeakingPromptUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> SpeakingTaskResponse:
    """Replace all fields of an existing speaking prompt."""
    repo = SpeakingPromptRepository(db)
    prompt = await repo.get_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Speaking prompt not found")
    updated = await repo.update(prompt, **body.model_dump())
    return SpeakingTaskResponse.model_validate(updated)


@router.delete("/prompts/speaking/{prompt_id}", status_code=204)
async def admin_delete_speaking(
    prompt_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> None:
    """Soft-delete a speaking prompt (sets is_active=False)."""
    repo = SpeakingPromptRepository(db)
    prompt = await repo.get_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Speaking prompt not found")
    await repo.soft_delete(prompt)


# ── Writing prompt admin endpoints ────────────────────────────────────────────

@router.get("/prompts/writing", response_model=list[WritingTaskResponse])
async def admin_list_writing(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> list[WritingTaskResponse]:
    """Return ALL writing prompts including inactive ones."""
    prompts = await WritingPromptRepository(db).list_all_admin()
    return [WritingTaskResponse.model_validate(p) for p in prompts]


@router.post("/prompts/writing", response_model=WritingTaskResponse, status_code=201)
async def admin_create_writing(
    body: WritingPromptCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> WritingTaskResponse:
    """Create a new writing prompt."""
    repo = WritingPromptRepository(db)
    prompt = await repo.create(**body.model_dump())
    return WritingTaskResponse.model_validate(prompt)


@router.put("/prompts/writing/{prompt_id}", response_model=WritingTaskResponse)
async def admin_update_writing(
    prompt_id: uuid.UUID,
    body: WritingPromptUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> WritingTaskResponse:
    """Replace all fields of an existing writing prompt."""
    repo = WritingPromptRepository(db)
    prompt = await repo.get_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Writing prompt not found")
    updated = await repo.update(prompt, **body.model_dump())
    return WritingTaskResponse.model_validate(updated)


@router.delete("/prompts/writing/{prompt_id}", status_code=204)
async def admin_delete_writing(
    prompt_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> None:
    """Soft-delete a writing prompt (sets is_active=False)."""
    repo = WritingPromptRepository(db)
    prompt = await repo.get_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Writing prompt not found")
    await repo.soft_delete(prompt)


# ── Calibration sample admin endpoints ────────────────────────────────────────

class CalibrationResponse(BaseModel):
    id: uuid.UUID
    skill: str
    task_number: int | None
    band_level: float
    sample_text: str
    source: str
    is_active: bool

    model_config = {"from_attributes": True}


@router.get("/calibration", response_model=list[CalibrationResponse])
async def admin_list_calibration(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> list[CalibrationResponse]:
    """List all calibration samples."""
    samples = await BaseRepository(CalibrationSample, db).list_all()
    return [CalibrationResponse.model_validate(s) for s in samples]


@router.post("/calibration", response_model=CalibrationResponse, status_code=201)
async def admin_create_calibration(
    body: CalibrationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> CalibrationResponse:
    """Add a new calibration sample."""
    repo: BaseRepository[CalibrationSample] = BaseRepository(CalibrationSample, db)
    sample = await repo.create(**body.model_dump())
    return CalibrationResponse.model_validate(sample)


@router.patch("/calibration/{sample_id}", response_model=CalibrationResponse)
async def admin_toggle_calibration(
    sample_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> CalibrationResponse:
    """Toggle is_active on a calibration sample."""
    repo: BaseRepository[CalibrationSample] = BaseRepository(CalibrationSample, db)
    sample = await repo.get_by_id(sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Calibration sample not found")
    updated = await repo.update(sample, is_active=not sample.is_active)
    return CalibrationResponse.model_validate(updated)
