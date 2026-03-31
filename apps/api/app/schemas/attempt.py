from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

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
    s3_key:            str
    audio_duration_ms: int

class StartWritingAttemptRequest(BaseModel):
    """Body for POST /writing/attempts/start."""
    prompt_id: UUID
    is_mock_test: bool = False

class SubmitWritingRequest(BaseModel):
    essay_text:     str
    auto_submitted: bool = False

class AttemptStatusResponse(BaseModel):
    """Maps to frontend Attempt interface (status polling)."""
    attempt_id:       UUID
    status:           str    # pending|processing|complete|failed
    skill:            str
    celery_task_id:   str | None
    error_message:    str | None
    report_available: bool   # True when status == 'complete'
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
