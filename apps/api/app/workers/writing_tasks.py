"""
Writing scoring worker — full AI pipeline (Phase 2).

Pipeline (9 steps — no STT):
  1. Mark attempt → 'processing'
  2. Load attempt + writing_attempt rows (essay_text already in DB)
  3. Build rubric system prompt with calibration context
  4. Score essay via LLM + log cost
  5. Persist ScoreReport
  6. Persist ScoreDimension rows (one per rubric criterion)
  7. Persist FeedbackReport
  8. Mark attempt → 'complete'

Writing differs from speaking in that it skips S3 download + Whisper
entirely: the essay text is already stored from Phase 1 submission.
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
from app.models.attempt import Attempt, WritingAttempt
from app.models.feedback_report import FeedbackReport
from app.models.score_report import ScoreReport, ScoreDimension
from app.services.ai.calibration import build_calibration_context
from app.services.ai.cost_tracker import log_cost
from app.services.ai.providers.openai_provider import OpenAIProvider
from app.services.ai.rubric.writing_rubric import build_writing_system_prompt

logger = logging.getLogger(__name__)

WRITING_DIMENSIONS = ["task_fulfillment", "organization", "tone_register", "vocabulary", "grammar"]

# ── Sync engine for status updates ───────────────────────────────────────────

_sync_engine: sa.engine.Engine | None = None


def _get_sync_engine() -> sa.engine.Engine:
    global _sync_engine
    if _sync_engine is None:
        sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
        _sync_engine = create_engine(sync_url, pool_size=2, max_overflow=2)
    return _sync_engine


def _mark_attempt_status(attempt_id: str, status: str, error_msg: str | None = None) -> None:
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
    name="app.workers.writing_tasks.score_writing_attempt",
    bind=True,
    queue="writing",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def score_writing_attempt(self, attempt_id: str) -> dict:
    """Full AI scoring pipeline for a writing attempt."""
    logger.info("Writing pipeline started: attempt=%s", attempt_id)
    try:
        asyncio.run(_run_writing_pipeline(attempt_id))
        return {"status": "complete", "attempt_id": attempt_id}
    except Exception as exc:
        logger.exception("Writing pipeline FAILED for attempt=%s", attempt_id)
        try:
            _mark_attempt_status(attempt_id, "failed", str(exc))
        except Exception:
            pass
        raise self.retry(exc=exc)


# ── Async pipeline ────────────────────────────────────────────────────────────

async def _run_writing_pipeline(attempt_id: str) -> None:
    attempt_uuid = UUID(attempt_id)
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

    writing_attempt = await db.get(WritingAttempt, attempt_id)
    if writing_attempt is None:
        raise LookupError(f"WritingAttempt {attempt_id} not found in DB")

    essay_text = writing_attempt.essay_text or ""
    if not essay_text.strip():
        raise ValueError(f"WritingAttempt {attempt_id} has empty essay_text")

    # Load prompt
    result = await db.execute(
        sa.text("SELECT prompt_text, task_number FROM writing_prompts WHERE id = :pid"),
        {"pid": attempt.prompt_id},
    )
    prompt_row = result.mappings().one_or_none()
    if prompt_row is None:
        raise LookupError(f"Prompt {attempt.prompt_id} not found")
    prompt_text: str = prompt_row["prompt_text"]
    task_number: int = prompt_row["task_number"]

    # Step 3 — build rubric prompt (no STT for writing)
    calibration_block = await build_calibration_context(db, skill="writing", task_number=task_number)
    system_prompt = build_writing_system_prompt(calibration_block)

    # Step 4 — score essay
    provider = OpenAIProvider()
    try:
        result_ = await provider.score_writing(essay_text, prompt_text, system_prompt)
    finally:
        await provider.aclose()
    await log_cost(db, attempt_id, "openai", settings.AI_SCORING_MODEL, "scoring", result_.usage)

    # Step 5 — persist ScoreReport
    report = ScoreReport(
        attempt_id=attempt_id,
        estimated_band=result_.estimated_band,
        scoring_model=settings.AI_SCORING_MODEL,
        raw_rubric_json=result_.raw_json,
    )
    db.add(report)
    await db.flush()

    # Step 6 — persist ScoreDimension rows
    for dim_name in WRITING_DIMENSIONS:
        dim = ScoreDimension(
            report_id=report.id,
            dimension=dim_name,
            score=getattr(result_, dim_name, 0),
            max_score=12,
        )
        db.add(dim)

    # Step 7 — persist FeedbackReport
    feedback = FeedbackReport(
        attempt_id=attempt_id,
        strengths=result_.strengths,
        weaknesses=result_.weaknesses,
        improvement_tips=result_.improvement_tips,
        sample_response=result_.sample_response,
    )
    db.add(feedback)

    # Step 8 — mark complete
    await db.execute(
        update(Attempt)
        .where(Attempt.id == attempt_id)
        .values(status="complete")
    )
    logger.info(
        "Writing pipeline complete: attempt=%s band=%.1f",
        attempt_id,
        result_.estimated_band,
    )
