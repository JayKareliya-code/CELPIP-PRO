"""Writing routes — tasks listing and attempt lifecycle."""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.prompt import WritingTaskResponse
from app.schemas.attempt import (
    StartWritingAttemptRequest,
    StartAttemptResponse,
    SubmitWritingRequest,
)
from app.services import prompt_service, attempt_service

router = APIRouter()


@router.get("/tasks", response_model=list[WritingTaskResponse])
async def list_writing_tasks(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> list[WritingTaskResponse]:
    """Return all active writing prompts ordered by task number."""
    prompts = await prompt_service.get_writing_tasks(db)
    return [WritingTaskResponse.model_validate(p) for p in prompts]


@router.get("/tasks/{task_number}", response_model=WritingTaskResponse)
async def get_writing_task(
    task_number: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> WritingTaskResponse:
    """Return a single active writing prompt by task number."""
    prompt = await prompt_service.get_writing_task(db, task_number)
    return WritingTaskResponse.model_validate(prompt)


@router.post("/attempts/start", response_model=StartAttemptResponse, status_code=201)
async def start_writing_attempt(
    body: StartWritingAttemptRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StartAttemptResponse:
    """Quota check + attempt creation run inside ONE DB transaction."""
    return await attempt_service.start_writing(
        db=db,
        user=user,
        prompt_id=body.prompt_id,
        is_mock_test=body.is_mock_test,
    )


@router.post("/attempts/{attempt_id}/submit", response_model=StartAttemptResponse)
async def submit_writing(
    attempt_id: uuid.UUID,
    body: SubmitWritingRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StartAttemptResponse:
    """Save essay, apply server-side word count, enqueue Celery scoring task.

    Server-side word count is authoritative — not the client's count.
    """
    return await attempt_service.submit_writing(
        db=db,
        user=user,
        attempt_id=attempt_id,
        essay_text=body.essay_text,
        auto_submitted=body.auto_submitted,
    )
