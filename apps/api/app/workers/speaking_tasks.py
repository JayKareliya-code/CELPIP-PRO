"""
Speaking scoring worker — full AI pipeline (Phase 2).

Pipeline (10 steps):
  1.  Mark attempt → 'processing'
  2.  Load attempt + speaking_attempt rows
  3.  Download audio from S3
  4.  Transcribe via Whisper (STT) + log cost
  5.  Save transcript to DB
  6.  Build rubric system prompt with calibration context
  7.  Score transcript via LLM + log cost
  8.  Persist ScoreReport
  9.  Persist ScoreDimension rows (one per rubric criterion)
  10. Persist FeedbackReport
  11. Mark attempt → 'complete'

Error handling:
  - Any exception triggers Celery retry (max 3×, 30s delay).
  - After all retries exhausted, attempt is marked 'failed'.
  - Calibration failure is non-fatal (pipeline continues with empty context).
"""
from __future__ import annotations

import asyncio
import logging
from uuid import UUID

import sqlalchemy as sa
from celery import shared_task
from sqlalchemy import create_engine, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.attempt import Attempt, SpeakingAttempt
from app.models.feedback_report import FeedbackReport
from app.models.score_report import ScoreReport, ScoreDimension
from app.models.transcript import Transcript
from app.services.ai.calibration import build_calibration_context
from app.services.ai.cost_tracker import log_cost
from app.services.ai.providers.openai_provider import OpenAIProvider
from app.services.ai.rubric.speaking_rubric import build_speaking_system_prompt
from app.services.storage.presigner import download_from_s3

logger = logging.getLogger(__name__)

SPEAKING_DIMENSIONS = ["task_completion", "coherence", "vocabulary", "fluency", "grammar"]

# ── Sync engine for simple status updates ────────────────────────────────────

_sync_engine: sa.engine.Engine | None = None


def _get_sync_engine() -> sa.engine.Engine:
    global _sync_engine
    if _sync_engine is None:
        sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
        _sync_engine = create_engine(sync_url, pool_size=2, max_overflow=2)
    return _sync_engine


def _mark_attempt_status(attempt_id: str, status: str, error_msg: str | None = None) -> None:
    """Synchronously set attempt.status — used for 'processing' and 'failed' states."""
    values: dict = {"status": status}
    if error_msg:
        values["error_message"] = error_msg[:2000]  # cap length
    with _get_sync_engine().begin() as conn:
        conn.execute(
            sa.text(
                "UPDATE attempts SET status=:status, error_message=:msg, updated_at=NOW() "
                "WHERE id=:id"
            ),
            {"status": status, "msg": error_msg, "id": UUID(attempt_id)},
        )


# ── Celery task ───────────────────────────────────────────────────────────────

@shared_task(
    name="app.workers.speaking_tasks.score_speaking_attempt",
    bind=True,
    queue="speaking",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def score_speaking_attempt(self, attempt_id: str) -> dict:
    """Full AI scoring pipeline for a speaking attempt."""
    logger.info("Speaking pipeline started: attempt=%s", attempt_id)
    try:
        asyncio.run(_run_speaking_pipeline(attempt_id))
        return {"status": "complete", "attempt_id": attempt_id}
    except Exception as exc:
        logger.exception("Speaking pipeline FAILED for attempt=%s", attempt_id)
        try:
            _mark_attempt_status(attempt_id, "failed", str(exc))
        except Exception:
            pass  # Don't let the status update mask the real exception
        raise self.retry(exc=exc)


# ── Async pipeline ────────────────────────────────────────────────────────────

async def _run_speaking_pipeline(attempt_id: str) -> None:
    attempt_uuid = UUID(attempt_id)

    # Build a fresh async engine + session for this asyncio.run() context.
    # (Celery workers spin up a new event loop per task — we cannot reuse the
    #  FastAPI engine which lives in a different loop.)
    engine = create_async_engine(settings.DATABASE_URL, future=True, pool_size=2)
    session_maker = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)

    async with session_maker() as db:
        try:
            await _pipeline(db, attempt_uuid)
            await db.commit()
        except Exception:
            await db.rollback()
            raise
        finally:
            await engine.dispose()


async def _pipeline(db: AsyncSession, attempt_id: UUID) -> None:
    # Step 1 — mark processing
    await db.execute(
        update(Attempt)
        .where(Attempt.id == attempt_id)
        .values(status="processing")
    )
    await db.flush()

    # Step 2 — load rows
    attempt = await db.get(Attempt, attempt_id)
    if attempt is None:
        raise LookupError(f"Attempt {attempt_id} not found in DB")

    speaking_attempt = await db.get(SpeakingAttempt, attempt_id)
    if speaking_attempt is None:
        raise LookupError(f"SpeakingAttempt {attempt_id} not found in DB")

    if not speaking_attempt.audio_s3_key:
        raise ValueError(f"SpeakingAttempt {attempt_id} has no audio_s3_key")

    # Load the prompt text (speaking_prompts table)
    result = await db.execute(
        sa.text("SELECT prompt_text, task_number FROM speaking_prompts WHERE id = :pid"),
        {"pid": attempt.prompt_id},
    )
    prompt_row = result.mappings().one_or_none()
    if prompt_row is None:
        raise LookupError(f"Prompt {attempt.prompt_id} not found")
    prompt_text: str = prompt_row["prompt_text"]
    task_number: int = prompt_row["task_number"]

    # Step 3 — download audio from S3
    logger.info("Downloading audio: attempt=%s key=%s", attempt_id, speaking_attempt.audio_s3_key)
    audio_bytes = await download_from_s3(speaking_attempt.audio_s3_key)

    # Step 4 — STT
    provider = OpenAIProvider()
    try:
        transcript_text, stt_usage = await provider.transcribe(audio_bytes)
        logger.info("Transcribed: attempt=%s chars=%d", attempt_id, len(transcript_text))
    finally:
        await provider.aclose()

    # Step 5 — save transcript
    transcript = Transcript(
        attempt_id=attempt_id,
        text=transcript_text,
        provider="openai",
        confidence_score=None,
    )
    db.add(transcript)
    await log_cost(db, attempt_id, "openai", settings.AI_STT_MODEL, "stt", stt_usage)

    # Step 6 — build rubric prompt
    calibration_block = await build_calibration_context(db, skill="speaking", task_number=task_number)
    system_prompt = build_speaking_system_prompt(calibration_block)

    # Step 7 — score
    provider = OpenAIProvider()
    try:
        result_ = await provider.score_speaking(transcript_text, prompt_text, system_prompt)
    finally:
        await provider.aclose()
    await log_cost(db, attempt_id, "openai", settings.AI_SCORING_MODEL, "scoring", result_.usage)

    # Step 8 — persist ScoreReport
    report = ScoreReport(
        attempt_id=attempt_id,
        estimated_band=result_.estimated_band,
        scoring_model=settings.AI_SCORING_MODEL,
        raw_rubric_json=result_.raw_json,
    )
    db.add(report)
    await db.flush()  # need report.id for dimensions

    # Step 9 — persist ScoreDimension rows
    for dim_name in SPEAKING_DIMENSIONS:
        dim = ScoreDimension(
            report_id=report.id,
            dimension=dim_name,
            score=getattr(result_, dim_name, 0),
            max_score=12,
        )
        db.add(dim)

    # Step 10 — persist FeedbackReport
    feedback = FeedbackReport(
        attempt_id=attempt_id,
        strengths=result_.strengths,
        weaknesses=result_.weaknesses,
        improvement_tips=result_.improvement_tips,
        sample_response=result_.sample_response,
    )
    db.add(feedback)

    # Step 11 — mark complete
    await db.execute(
        update(Attempt)
        .where(Attempt.id == attempt_id)
        .values(status="complete")
    )
    logger.info(
        "Speaking pipeline complete: attempt=%s band=%.1f",
        attempt_id,
        result_.estimated_band,
    )
