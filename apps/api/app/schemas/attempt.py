from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

from app.core.config import settings

class StartSpeakingAttemptRequest(BaseModel):
    """Body for POST /speaking/attempts/start."""
    prompt_id: UUID
    is_mock_test: bool = False

class StartAttemptResponse(BaseModel):
    attempt_id: UUID
    status: str
    created_at: datetime

class UploadUrlResponse(BaseModel):
    upload_url:         str    # S3 pre-signed PUT URL
    s3_key:             str
    expires_in_seconds: int

class ConfirmUploadRequest(BaseModel):
    s3_key:            str = Field(..., max_length=512)
    audio_duration_ms: int = Field(..., ge=0, le=30 * 60 * 1000)  # ≤30 min

class StartWritingAttemptRequest(BaseModel):
    """Body for POST /writing/attempts/start."""
    prompt_id:        UUID
    is_mock_test:     bool    = False
    mock_exam_number: int | None = None   # test slot (1–N); required when is_mock_test=True

class SubmitWritingRequest(BaseModel):
    essay_text: str = Field(
        ...,
        min_length=settings.ESSAY_MIN_CHARS,
        max_length=settings.ESSAY_MAX_CHARS,
    )
    auto_submitted: bool = False

class AttemptStatusResponse(BaseModel):
    """Maps to frontend Attempt interface (status polling)."""
    attempt_id:       UUID
    status:           str    # pending|processing|complete|failed
    skill:            str
    celery_task_id:   str | None
    error_message:    str | None
    report_available: bool        # True when status == 'complete'
    estimated_band:   float | None = None  # Populated when status == 'complete'
    created_at:       datetime
    updated_at:       datetime

class QuotaStatusResponse(BaseModel):
    """Maps to frontend useQuota hook expectations."""
    plan:                    str
    speaking_used_per_task:  dict[int, int]   # {task_number: count}
    writing_used_per_task:   dict[int, int]
    speaking_limit_per_task: int | None
    writing_limit_per_task:  int | None
    can_attempt_speaking:    dict[int, bool]
    can_attempt_writing:     dict[int, bool]
    # ── Addon credits per task (plan baseline + these = effectiveLimit) ───────
    # Keys are task_number ints; missing key → 0 addon credits for that task.
    # speaking_pack purchase expands into all 8 tasks at webhook time, so
    # speaking_addon_credits_per_task[4] will be non-zero for both a speaking_pack
    # AND a custom_bundle targeting task 4.
    speaking_addon_credits_per_task: dict[int, int] = {}
    writing_addon_credits_per_task:  dict[int, int] = {}
    # ── Mock-exam session counts (used by usePracticeQuota) ──────────────────
    speaking_mock_tests_used: int = 0
    writing_mock_tests_used:  int = 0
