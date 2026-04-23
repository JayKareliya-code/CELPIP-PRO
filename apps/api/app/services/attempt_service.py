"""Attempt service — orchestrates quota enforcement, DB writes, and Celery dispatch."""
import uuid
import logging
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.quota import enforce_quota
from app.models.user import User
from app.models.attempt import Attempt, SpeakingAttempt, WritingAttempt
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.prompt_repo import SpeakingPromptRepository, WritingPromptRepository
from app.schemas.attempt import StartAttemptResponse
from app.services.storage_service import validate_uploaded_audio

logger = logging.getLogger(__name__)

# Word counter matching the frontend countWords() function
def _count_words(text: str) -> int:
    """Count words server-side (source of truth for billing / quota validation)."""
    return len(text.strip().split()) if text.strip() else 0


async def start_speaking(
    *,
    db: AsyncSession,
    user: User,
    prompt_id: uuid.UUID,
    is_mock_test: bool = False,
) -> StartAttemptResponse:
    """Create a speaking attempt after quota check — all inside one transaction.

    On quota failure the HTTPException propagates; get_db rolls back, preventing
    orphan attempt records.
    """
    # Resolve prompt → get task_number for quota check
    prompt = await SpeakingPromptRepository(db).get_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Speaking prompt not found")

    await enforce_quota(
        user=user,
        skill="speaking",
        task_number=prompt.task_number,
        is_mock_test=is_mock_test,
        db=db,
    )

    repo = AttemptRepository(db)
    attempt: Attempt = await repo.create(
        user_id=user.id,
        skill="speaking",
        prompt_id=prompt_id,
        task_number=prompt.task_number,
        is_mock_test=is_mock_test,
        status="pending",
    )
    # Create the speaking-specific child row
    db.add(SpeakingAttempt(attempt_id=attempt.id))
    await db.flush()

    logger.info("Speaking attempt %s created for user %s", attempt.id, user.id)
    return StartAttemptResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        created_at=attempt.created_at,
    )


async def confirm_speaking_upload(
    *,
    db: AsyncSession,
    user: User,
    attempt_id: uuid.UUID,
    s3_key: str,
    audio_duration_ms: int,
) -> StartAttemptResponse:
    """Mark audio upload complete and enqueue Celery scoring task."""
    attempt = await AttemptRepository(db).get_status(attempt_id, user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status != "pending":
        raise HTTPException(status_code=409, detail=f"Attempt already in status '{attempt.status}'")

    # Ownership check — client must only reference its own upload path.
    expected_prefix = f"{settings.S3_AUDIO_PREFIX}{user.id}/"
    if not s3_key.startswith(expected_prefix):
        raise HTTPException(status_code=400, detail="s3_key does not belong to this user.")

    # Validate the uploaded audio before spending Celery + AI resources.
    validate_uploaded_audio(s3_key)

    # Update the speaking child row
    row = (await db.execute(
        select(SpeakingAttempt).where(SpeakingAttempt.attempt_id == attempt_id)
    )).scalar_one_or_none()
    if row:
        row.audio_s3_key = s3_key
        row.audio_duration_ms = audio_duration_ms
        row.upload_completed = True
        db.add(row)

    attempt.status = "processing"
    db.add(attempt)
    await db.flush()

    # Dispatch Celery task (import here to avoid circular on startup).
    # If the broker is unreachable, revert status to "pending" and surface a 503
    # so the client knows to retry — avoids orphaned "processing" records.
    try:
        from app.workers.speaking_tasks import score_speaking_attempt
        task = score_speaking_attempt.delay(str(attempt_id))
        attempt.celery_task_id = task.id
        db.add(attempt)
        await db.flush()
    except Exception:
        logger.exception("Failed to enqueue speaking task for %s", attempt_id)
        attempt.status = "pending"
        db.add(attempt)
        await db.flush()
        raise HTTPException(
            status_code=503,
            detail="Scoring service unavailable. Please try again in a moment.",
        )

    return StartAttemptResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        created_at=attempt.created_at,
    )


async def start_writing(
    *,
    db: AsyncSession,
    user: User,
    prompt_id: uuid.UUID,
    is_mock_test: bool = False,
    mock_exam_number: int | None = None,
) -> StartAttemptResponse:
    """Create a writing attempt after quota check.

    mock_exam_number identifies the test slot (1, 2, 3 …).  When provided,
    quota is enforced at the SLOT level: re-doing a slot is always free; only
    genuinely new slots count against the plan limit.
    """
    prompt = await WritingPromptRepository(db).get_by_id(prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Writing prompt not found")

    await enforce_quota(
        user=user,
        skill="writing",
        task_number=prompt.task_number,
        is_mock_test=is_mock_test,
        db=db,
        mock_exam_number=mock_exam_number,
    )

    repo = AttemptRepository(db)
    attempt: Attempt = await repo.create(
        user_id=user.id,
        skill="writing",
        prompt_id=prompt_id,
        task_number=prompt.task_number,
        is_mock_test=is_mock_test,
        status="pending",
    )
    # Store the slot number so quota can count DISTINCT slots later
    if mock_exam_number is not None:
        attempt.mock_exam_number = mock_exam_number
        db.add(attempt)

    db.add(WritingAttempt(attempt_id=attempt.id))
    await db.flush()

    logger.info("Writing attempt %s created for user %s (slot=%s)", attempt.id, user.id, mock_exam_number)
    return StartAttemptResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        created_at=attempt.created_at,
    )



async def submit_writing(
    *,
    db: AsyncSession,
    user: User,
    attempt_id: uuid.UUID,
    essay_text: str,
    auto_submitted: bool,
) -> StartAttemptResponse:
    """Save essay text with server-side word count and enqueue scoring task."""
    attempt = await AttemptRepository(db).get_status(attempt_id, user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status != "pending":
        raise HTTPException(status_code=409, detail=f"Attempt already in status '{attempt.status}'")

    word_count = _count_words(essay_text)

    row = (await db.execute(
        select(WritingAttempt).where(WritingAttempt.attempt_id == attempt_id)
    )).scalar_one_or_none()
    if row:
        row.essay_text = essay_text
        row.word_count = word_count
        row.char_count = len(essay_text)
        row.auto_submitted = auto_submitted
        db.add(row)

    attempt.status = "processing"
    db.add(attempt)
    await db.flush()

    try:
        if attempt.is_mock_test:
            # Mock exam → lightweight band-estimate only (no rubric/feedback)
            from app.workers.writing_mock_tasks import score_writing_mock_task  # noqa: PLC0415
            task = score_writing_mock_task.delay(str(attempt_id))
        else:
            # Practice attempt → full rubric scoring + feedback pipeline
            from app.workers.writing_tasks import score_writing_attempt  # noqa: PLC0415
            task = score_writing_attempt.delay(str(attempt_id))
        attempt.celery_task_id = task.id
        db.add(attempt)
        await db.flush()
    except Exception:
        logger.exception("Failed to enqueue writing task for %s", attempt_id)
        attempt.status = "pending"
        db.add(attempt)
        await db.flush()
        raise HTTPException(
            status_code=503,
            detail="Scoring service unavailable. Please try again in a moment.",
        )

    return StartAttemptResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        created_at=attempt.created_at,
    )
