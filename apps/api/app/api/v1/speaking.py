"""Speaking routes — tasks listing and attempt lifecycle."""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.prompt import SpeakingTaskResponse
from app.schemas.attempt import (
    StartSpeakingAttemptRequest,
    StartAttemptResponse,
    UploadUrlResponse,
    ConfirmUploadRequest,
)
from app.services import prompt_service, attempt_service
from app.services.storage_service import generate_upload_url

router = APIRouter()


@router.get("/tasks", response_model=list[SpeakingTaskResponse])
async def list_speaking_tasks(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> list[SpeakingTaskResponse]:
    """Return all active speaking prompts ordered by task number."""
    prompts = await prompt_service.get_speaking_tasks(db)
    return [SpeakingTaskResponse.model_validate(p) for p in prompts]


@router.get("/tasks/by-id/{prompt_id}", response_model=SpeakingTaskResponse)
async def get_speaking_task_by_id(
    prompt_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> SpeakingTaskResponse:
    """Return a single active speaking prompt by its UUID.

    Used by the frontend server-side pages where the URL contains the task UUID.
    """
    prompt = await prompt_service.get_speaking_prompt_by_id(db, prompt_id)
    return SpeakingTaskResponse.model_validate(prompt)


@router.get("/tasks/{task_number}", response_model=SpeakingTaskResponse)
async def get_speaking_task(
    task_number: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> SpeakingTaskResponse:
    """Return a single active speaking prompt by task number."""
    prompt = await prompt_service.get_speaking_task(db, task_number)
    return SpeakingTaskResponse.model_validate(prompt)


@router.post("/attempts/start", response_model=StartAttemptResponse, status_code=201)
async def start_speaking_attempt(
    body: StartSpeakingAttemptRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StartAttemptResponse:
    """Quota check + attempt creation run inside ONE DB transaction.

    On quota failure → rolls back → no orphan attempt records.
    Pass `is_mock_test=true` as a query parameter for mock test mode.
    """
    return await attempt_service.start_speaking(
        db=db,
        user=user,
        prompt_id=body.prompt_id,
        is_mock_test=body.is_mock_test,
    )


@router.post("/attempts/{attempt_id}/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    attempt_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UploadUrlResponse:
    """Return a pre-signed S3 PUT URL valid for 15 minutes.

    The frontend should PUT the recorded audio blob directly to this URL,
    then call /confirm-upload with the s3_key returned here.
    """
    from app.repositories.attempt_repo import AttemptRepository
    attempt = await AttemptRepository(db).get_status(attempt_id, user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    upload_url, s3_key = generate_upload_url(str(user.id), str(attempt_id))
    return UploadUrlResponse(
        upload_url=upload_url,
        s3_key=s3_key,
        expires_in_seconds=900,
    )


@router.post("/attempts/{attempt_id}/confirm-upload", response_model=StartAttemptResponse)
async def confirm_upload(
    attempt_id: uuid.UUID,
    body: ConfirmUploadRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StartAttemptResponse:
    """Mark audio upload complete, transition to 'processing', enqueue Celery task."""
    return await attempt_service.confirm_speaking_upload(
        db=db,
        user=user,
        attempt_id=attempt_id,
        s3_key=body.s3_key,
        audio_duration_ms=body.audio_duration_ms,
    )
