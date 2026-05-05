"""
Mock Exam routes — prompt listing, per-task audio upload, and results polling.

Endpoints:
  GET  /mock-exam/prompts
       Returns all 'mock'-tagged published speaking prompts.

  POST /mock-exam/attempts/{session_id}/tasks/{task_number}/upload-url
       Returns a presigned S3 PUT URL for one task's audio recording.
       Key:  mock-tests/{user_id}/{session_id}/task-{task_number}.webm

  POST /mock-exam/attempts/{session_id}/tasks/{task_number}/confirm-upload
       Persists a MockExamTaskAttempt row and enqueues background scoring.
       Returns { attempt_id, s3_key }.

  GET  /mock-exam/attempts/{session_id}/results
       Poll endpoint — returns band scores for all tasks in a session.
"""
import uuid
from typing import Annotated

import boto3
import redis.asyncio as aioredis
from botocore.config import Config as BotoCoreConfig
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db, get_redis_pool
from app.core.quota import enforce_mock_exam_plan_access
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.models.mock_exam_attempt import MockExamTaskAttempt
from app.models.user import User
from app.schemas.prompt import SpeakingTaskResponse
from app.services import prompt_service
from app.services.storage_service import validate_uploaded_audio
from app.api.v1.speaking import _sign_prompt   # reuse existing presign helper

router = APIRouter()
CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]

MOCK_AUDIO_PREFIX   = "mock-tests/"
VALID_TASK_NUMBERS  = set(range(1, 9))


# ── Schemas ────────────────────────────────────────────────────────────────────

class UploadUrlRequest(BaseModel):
    prompt_id: str | None = None


class UploadUrlResponse(BaseModel):
    upload_url:          str
    s3_key:              str
    expires_in_seconds:  int = 900
    max_bytes:           int


class ConfirmUploadRequest(BaseModel):
    s3_key:            str = Field(..., max_length=512)
    audio_duration_ms: int = Field(0, ge=0, le=30 * 60 * 1000)  # ≤30 min


class ConfirmUploadResponse(BaseModel):
    attempt_id: str
    s3_key:     str


class TaskResultItem(BaseModel):
    task_number:    int
    status:         str
    estimated_band: float | None = None


class SessionResultsResponse(BaseModel):
    session_id: str
    tasks:      list[TaskResultItem]
    all_scored: bool


# ── Helpers ────────────────────────────────────────────────────────────────────


def _validate_session_id(session_id: str) -> str:
    """Ensure session_id is a well-formed UUID to prevent path traversal in S3 keys."""
    try:
        return str(uuid.UUID(session_id))
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail="Invalid session_id (must be a UUID)."
        ) from exc


def _mock_s3_key(user_id: str, session_id: str, task_number: int) -> str:
    return f"{MOCK_AUDIO_PREFIX}{user_id}/{session_id}/task-{task_number}.webm"


def _get_s3_client():
    endpoint = settings.S3_ENDPOINT_URL or f"https://s3.{settings.S3_REGION}.amazonaws.com"
    return boto3.client(
        "s3",
        region_name=settings.S3_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=BotoCoreConfig(signature_version="s3v4"),
        endpoint_url=endpoint,
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/mock-exam/prompts", response_model=list[SpeakingTaskResponse])
async def list_mock_exam_prompts(
    db: DB,
    _user: CurrentUser,
    redis: Annotated[aioredis.Redis, Depends(get_redis_pool)],
    slot: int = Query(..., ge=1, le=20, description="Exam slot number (1, 2, …)"),
) -> list[SpeakingTaskResponse]:
    """Return published+active speaking prompts for a specific mock exam slot.

    Requires ?slot=N query param. Returns 404 when no prompts are assigned
    to that slot yet so the frontend can show a 'coming soon' screen.
    """
    prompts = await prompt_service.get_mock_exam_prompts(db, slot)
    if not prompts:
        raise HTTPException(
            status_code=404,
            detail=f"Mock Exam {slot} is not available yet. Check back soon.",
        )
    return [await _sign_prompt(p, redis) for p in prompts]


@router.post(
    "/mock-exam/attempts/{session_id}/tasks/{task_number}/upload-url",
    response_model=UploadUrlResponse,
)
@limiter.limit(settings.RATE_LIMIT_SUBMISSIONS_PER_MIN)
async def get_mock_task_upload_url(
    request: Request,
    response: Response,
    db:          DB,
    session_id:  str = Path(..., description="Exam session UUID from client"),
    task_number: int = Path(..., ge=1, le=8),
    body: UploadUrlRequest = UploadUrlRequest(),
    user: User = Depends(get_current_user),
) -> UploadUrlResponse:
    """Return a presigned S3 PUT URL for one task's audio recording.

    Enforces the mock-exam quota on the first task of a session so the user
    cannot burn AI spend past their plan limit.
    """
    session_id = _validate_session_id(session_id)

    # Plan-access gate — starters cannot use mock exams.
    # Pro/Ultra users get unlimited retries (no session counting).
    await enforce_mock_exam_plan_access(user=user)

    s3_key = _mock_s3_key(str(user.id), session_id, task_number)
    try:
        upload_url: str = _get_s3_client().generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.S3_BUCKET_NAME,
                "Key": s3_key,
                "ContentType": "audio/webm",
            },
            ExpiresIn=settings.S3_UPLOAD_EXPIRY_SECS,
        )
    except Exception as exc:
        raise HTTPException(500, f"Could not generate upload URL: {exc}") from exc

    return UploadUrlResponse(
        upload_url=upload_url,
        s3_key=s3_key,
        expires_in_seconds=settings.S3_UPLOAD_EXPIRY_SECS,
        max_bytes=settings.AUDIO_MAX_BYTES,
    )


@router.post(
    "/mock-exam/attempts/{session_id}/tasks/{task_number}/confirm-upload",
    response_model=ConfirmUploadResponse,
)
@limiter.limit(settings.RATE_LIMIT_SUBMISSIONS_PER_MIN)
async def confirm_mock_task_upload(
    request: Request,
    response: Response,
    db:          DB,
    session_id:  str = Path(...),
    task_number: int = Path(..., ge=1, le=8),
    body: ConfirmUploadRequest = ...,
    user: User = Depends(get_current_user),
) -> ConfirmUploadResponse:
    """Persist the attempt row, then enqueue background scoring.

    Validates the uploaded S3 object exists and is within size/type limits
    BEFORE consuming Celery resources.
    """
    session_id = _validate_session_id(session_id)

    # Plan-access gate — mirrors the upload-url check.
    await enforce_mock_exam_plan_access(user=user)

    # s3_key ownership check — prevent the client from referencing someone else's upload.
    expected_prefix = f"{MOCK_AUDIO_PREFIX}{user.id}/{session_id}/"
    if not body.s3_key.startswith(expected_prefix):
        raise HTTPException(status_code=400, detail="s3_key does not belong to this session.")

    # Validate the object in S3 (size, content-type) before queueing expensive work.
    validate_uploaded_audio(body.s3_key)

    attempt = MockExamTaskAttempt(
        session_id=session_id,
        user_id=user.id,
        task_number=task_number,
        audio_s3_key=body.s3_key,
        audio_duration_ms=body.audio_duration_ms or None,
        status="pending",
    )
    db.add(attempt)
    await db.flush()
    await db.refresh(attempt)

    from app.workers.mock_exam_tasks import score_mock_exam_task  # noqa: PLC0415
    celery_result = score_mock_exam_task.delay(str(attempt.id))

    attempt.celery_task_id = celery_result.id
    await db.flush()

    return ConfirmUploadResponse(
        attempt_id=str(attempt.id),
        s3_key=body.s3_key,
    )


@router.get(
    "/mock-exam/attempts/{session_id}/results",
    response_model=SessionResultsResponse,
)
async def get_session_results(
    db:         DB,
    session_id: str = Path(...),
    user: User  = Depends(get_current_user),
) -> SessionResultsResponse:
    """Poll endpoint — returns band scores for all tasks in a session."""
    session_id = _validate_session_id(session_id)

    rows = (
        await db.execute(
            select(MockExamTaskAttempt)
            .where(MockExamTaskAttempt.session_id == session_id)
            .where(MockExamTaskAttempt.user_id == user.id)
            .order_by(MockExamTaskAttempt.task_number)
        )
    ).scalars().all()

    terminal = {"complete", "failed"}
    tasks = [
        TaskResultItem(
            task_number=r.task_number,
            status=r.status,
            estimated_band=float(r.estimated_band) if r.estimated_band is not None else None,
        )
        for r in rows
    ]

    all_scored = bool(rows) and all(t.status in terminal for t in tasks)

    return SessionResultsResponse(
        session_id=session_id,
        tasks=tasks,
        all_scored=all_scored,
    )
