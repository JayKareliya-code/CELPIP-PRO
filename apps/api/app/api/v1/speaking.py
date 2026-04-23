"""Speaking routes — tasks listing and attempt lifecycle."""
import uuid
import logging
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.deps import get_db, get_redis_pool
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.models.user import User
from app.models.prompt import SpeakingPrompt
from app.schemas.prompt import SpeakingTaskResponse
from app.schemas.attempt import (
    StartSpeakingAttemptRequest,
    StartAttemptResponse,
    UploadUrlResponse,
    ConfirmUploadRequest,
)
from app.services import prompt_service, attempt_service
from app.services.storage_service import generate_upload_url
from app.services.storage.presigner import generate_presigned_get_cached
from app.api.v1._prompt_helpers import extract_s3_key as _extract_s3_key  # shared robust extractor

logger = logging.getLogger(__name__)
router = APIRouter()

# Image presign TTL — long enough for an entire practice session, short enough
# that a leaked URL doesn't grant indefinite access.
_IMAGE_PRESIGN_TTL_S = 7200


async def _sign_option_image(image_url: str, prompt_id: str, redis: aioredis.Redis) -> str:
    """Return a presigned GET URL for an option card image, or the original on failure."""
    try:
        s3_key = _extract_s3_key(image_url)
        return await generate_presigned_get_cached(
            key=s3_key, expires_in=_IMAGE_PRESIGN_TTL_S, redis=redis,
        )
    except Exception:
        logger.warning(
            "Could not presign option image for prompt %s — serving raw URL.", prompt_id
        )
        return image_url


async def _sign_prompt(prompt: SpeakingPrompt, redis: aioredis.Redis) -> SpeakingTaskResponse:
    """
    Build a SpeakingTaskResponse, replacing every stored S3 URL with a
    2-hour presigned GET URL so the browser can display images without needing
    a public-read bucket policy.

    Presigns:
      • context_image_url            — scene image for Tasks 3, 4, 8
      • choice_options[*].image_url  — option card images for Task 5
      • curveball_option.image_url   — curveball card image for Task 5

    Falls back to the raw stored URL if S3 credentials are not configured.
    """
    data = SpeakingTaskResponse.model_validate(prompt)

    # ── Scene image (Tasks 3, 4, 8) ───────────────────────────────────────────
    if data.context_image_url:
        try:
            s3_key = _extract_s3_key(data.context_image_url)
            data.context_image_url = await generate_presigned_get_cached(
                key=s3_key, expires_in=_IMAGE_PRESIGN_TTL_S, redis=redis,
            )
        except Exception:
            logger.warning(
                "Could not generate presigned URL for prompt %s — serving raw URL. "
                "Check S3 credentials.",
                prompt.id,
            )

    # ── Task 5 option card images ─────────────────────────────────────────────
    pid = str(prompt.id)

    if data.choice_options:
        signed_options = []
        for opt in data.choice_options:
            # After model_validate, opt is a ChoiceOption Pydantic object (not a dict)
            if opt.image_url:
                signed_url = await _sign_option_image(opt.image_url, pid, redis)
                opt = opt.model_copy(update={"image_url": signed_url})
            signed_options.append(opt)
        data.choice_options = signed_options

    if data.curveball_option and data.curveball_option.image_url:
        signed_url = await _sign_option_image(data.curveball_option.image_url, pid, redis)
        data.curveball_option = data.curveball_option.model_copy(
            update={"image_url": signed_url}
        )

    return data


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/tasks", response_model=list[SpeakingTaskResponse])
async def list_speaking_tasks(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
    redis: Annotated[aioredis.Redis, Depends(get_redis_pool)],
) -> list[SpeakingTaskResponse]:
    """Return all active speaking prompts with presigned image URLs."""
    prompts = await prompt_service.get_speaking_tasks(db)
    return [await _sign_prompt(p, redis) for p in prompts]


@router.get("/tasks/by-id/{prompt_id}", response_model=SpeakingTaskResponse)
async def get_speaking_task_by_id(
    prompt_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
    redis: Annotated[aioredis.Redis, Depends(get_redis_pool)],
) -> SpeakingTaskResponse:
    """Return a single active speaking prompt by UUID with a presigned image URL."""
    prompt = await prompt_service.get_speaking_prompt_by_id(db, prompt_id)
    return await _sign_prompt(prompt, redis)


@router.get("/tasks/{task_number}/attempted-prompts", response_model=list[str])
async def get_attempted_prompt_ids(
    task_number: int,
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> list[str]:
    """Return prompt UUIDs the user has already attempted for a given task.

    Used by the /speaking/[task] prompt-list page to mark prompts as
    attempted so the UI can show a green 'Redo' CTA instead of 'Start Practice'.
    """
    from app.repositories.attempt_repo import AttemptRepository
    ids = await AttemptRepository(db).get_attempted_prompt_ids(
        user.id, task_number
    )
    return list(ids)


@router.get("/tasks/{task_number}", response_model=SpeakingTaskResponse)
async def get_speaking_task(
    task_number: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
    redis: Annotated[aioredis.Redis, Depends(get_redis_pool)],
) -> SpeakingTaskResponse:
    """Return a single active speaking prompt by task number with a presigned image URL."""
    prompt = await prompt_service.get_speaking_task(db, task_number)
    return await _sign_prompt(prompt, redis)



@router.post("/attempts/start", response_model=StartAttemptResponse, status_code=201)
@limiter.limit(settings.RATE_LIMIT_ATTEMPTS_PER_MIN)
async def start_speaking_attempt(
    request: Request,
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
@limiter.limit(settings.RATE_LIMIT_SUBMISSIONS_PER_MIN)
async def get_upload_url(
    request: Request,
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
@limiter.limit(settings.RATE_LIMIT_SUBMISSIONS_PER_MIN)
async def confirm_upload(
    request: Request,
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
