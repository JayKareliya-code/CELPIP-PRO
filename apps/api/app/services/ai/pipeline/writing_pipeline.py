"""
Writing scoring pipeline — all business logic for one writing attempt.

Steps
-----
1. mark_processing   — set status = 'processing'
2. load_attempt      — fetch Attempt + WritingAttempt, validate essay_text
3. load_prompt       — fetch prompt_text, task_number from writing_prompts
4. load_user_target  — fetch user's target_band
5. build_prompt      — assemble rubric system prompt (+ calibration + task-type addendum)
6. score             — LLM scoring, log cost
7. save_score        — persist ScoreReport + ScoreDimension rows
8. save_feedback     — persist FeedbackReport
9. mark_complete     — set status = 'complete'

Writing skips S3 download + STT entirely: the essay text is already stored
from the Phase 1 submission (submit_writing in attempt_service.py).
"""
from __future__ import annotations

import logging
from dataclasses import asdict
from uuid import UUID

import sqlalchemy as sa
from functools import lru_cache
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.attempt import Attempt, WritingAttempt
from app.models.feedback_report import FeedbackReport
from app.models.score_report import ScoreReport, ScoreDimension
from app.services.ai.base import ScoringResult
from app.services.ai.calibration import build_calibration_context
from app.services.ai.cost_tracker import log_cost
from app.services.ai.providers.openai_provider import OpenAIProvider
from app.services.ai.rubric.writing_rubric import build_writing_system_prompt

logger = logging.getLogger(__name__)

# Official CELPIP 4-dimension model (schema v2)
WRITING_DIMENSIONS = [
    "content_coherence",
    "vocabulary",
    "readability",
    "task_fulfillment",
]
SCHEMA_VERSION = 2


# ── Session factory ───────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_engine():
    """Return the shared async engine for this worker process.

    @lru_cache is safe here because each Celery ForkPoolWorker runs on a
    single persistent event loop (see app.core.async_worker).  The engine is
    created once per worker process and reused across tasks.
    """
    return create_async_engine(
        settings.DATABASE_URL,
        future=True,
        pool_size=2,
        max_overflow=2,
        pool_pre_ping=True,
    )


async def run_writing_pipeline(attempt_id: str) -> None:
    """Acquire a session from the process-wide engine and run the pipeline."""
    session_maker = async_sessionmaker(_get_engine(), expire_on_commit=False, autoflush=False)
    async with session_maker() as db:
        try:
            await _pipeline(db, UUID(attempt_id))
            await db.commit()
        except Exception:
            await db.rollback()
            raise


# ── Orchestrator ──────────────────────────────────────────────────────────────

async def _pipeline(db: AsyncSession, attempt_id: UUID) -> None:
    await _mark_processing(db, attempt_id)
    attempt, w_attempt      = await _load_attempt(db, attempt_id)
    prompt_text, task_number, sample_band12, time_limit = await _load_prompt(db, attempt.prompt_id)
    target_band             = await _load_user_target_band(db, attempt.user_id)
    system_prompt           = await _build_prompt(db, task_number, target_band, sample_band12, time_limit)
    result                  = await _score(db, attempt_id, w_attempt.essay_text, prompt_text, system_prompt)
    await _save_score(db, attempt_id, result, actual_model=settings.AI_SCORING_MODEL)
    await _save_feedback(db, attempt_id, result)
    await _mark_complete(db, attempt_id, result)


# ── Steps ─────────────────────────────────────────────────────────────────────

async def _mark_processing(db: AsyncSession, attempt_id: UUID) -> None:
    await db.execute(update(Attempt).where(Attempt.id == attempt_id).values(status="processing"))
    await db.flush()


async def _load_attempt(db: AsyncSession, attempt_id: UUID) -> tuple[Attempt, WritingAttempt]:
    attempt = await db.get(Attempt, attempt_id)
    if not attempt:
        raise LookupError(f"Attempt {attempt_id} not found in DB")

    w_attempt = await db.get(WritingAttempt, attempt_id)
    if not w_attempt:
        raise LookupError(f"WritingAttempt {attempt_id} not found in DB")

    essay_text = w_attempt.essay_text or ""
    if not essay_text.strip():
        raise ValueError(f"WritingAttempt {attempt_id} has empty essay_text")

    return attempt, w_attempt


async def _load_prompt(db: AsyncSession, prompt_id: UUID) -> tuple[str, int, str, int]:
    """Return (prompt_text, task_number, sample_response_text, time_limit_seconds)."""
    row = (
        await db.execute(
            sa.text(
                "SELECT prompt_text, task_number, sample_response_text, time_limit_seconds "
                "FROM writing_prompts WHERE id = :pid"
            ),
            {"pid": prompt_id},
        )
    ).mappings().one_or_none()
    if row is None:
        raise LookupError(f"Writing prompt {prompt_id} not found")
    return (
        row["prompt_text"],
        row["task_number"],
        row["sample_response_text"] or "",
        row["time_limit_seconds"] or 1800,
    )


async def _load_user_target_band(db: AsyncSession, user_id: UUID) -> float | None:
    """Fetch the user's target_band from the users table (None if not set)."""
    row = (
        await db.execute(
            sa.text("SELECT target_band FROM users WHERE id = :uid"),
            {"uid": user_id},
        )
    ).mappings().one_or_none()
    band = float(row["target_band"]) if row and row["target_band"] is not None else None
    logger.info("User target_band: %s", band)
    return band


async def _build_prompt(
    db: AsyncSession,
    task_number: int,
    target_band: float | None,
    sample_band12: str = "",
    time_limit_seconds: int = 1800,
) -> str:
    # max_chars scales at 3× the time limit (writing produces ~3 chars/sec at Band 12).
    # Minimum of 400 enforced so very short tasks still have a useful anchor.
    max_chars = max(400, time_limit_seconds * 3)
    calibration = await build_calibration_context(
        db,
        skill="writing",
        task_number=task_number,
        prompt_band12_sample=sample_band12 or None,
        max_chars=max_chars,
    )
    return build_writing_system_prompt(
        calibration_block=calibration,
        task_number=task_number,
        target_band=target_band,
    )


async def _score(
    db: AsyncSession,
    attempt_id: UUID,
    essay_text: str,
    prompt_text: str,
    system_prompt: str,
) -> ScoringResult:
    provider = OpenAIProvider()
    try:
        result = await provider.score_writing(
            essay_text=essay_text,
            prompt_text=prompt_text,
            system_prompt=system_prompt,
        )
    finally:
        await provider.aclose()
    await log_cost(db, attempt_id, "openai", settings.AI_SCORING_MODEL, "scoring", result.usage)
    logger.info("Scored: attempt=%s band=%.1f", attempt_id, result.estimated_band)
    return result


async def _save_score(
    db: AsyncSession,
    attempt_id: UUID,
    result: ScoringResult,
    actual_model: str,
) -> None:
    """Persist ScoreReport using the model that was *actually* used for this call.

    schema_version=2 identifies this as the official CELPIP 4-dimension model.
    """
    report = ScoreReport(
        attempt_id=attempt_id,
        estimated_band=result.estimated_band,
        scoring_model=actual_model,
        raw_rubric_json=result.raw_json,
        schema_version=SCHEMA_VERSION,
        likely_range=result.likely_range or None,
    )
    db.add(report)
    await db.flush()
    for dim in WRITING_DIMENSIONS:
        db.add(ScoreDimension(
            report_id=report.id,
            dimension=dim,
            score=getattr(result, dim, 0),
            max_score=12,
        ))


async def _save_feedback(db: AsyncSession, attempt_id: UUID, result: ScoringResult) -> None:
    db.add(FeedbackReport(
        attempt_id=attempt_id,
        strengths=[asdict(s) for s in result.strengths],
        weaknesses=[asdict(w) for w in result.weaknesses],
        improvement_tips=[asdict(t) for t in result.improvement_tips],
        sample_response=result.sample_response,
        next_milestone=result.next_milestone or None,
        dimension_commentary=result.dimension_commentary or None,
    ))


async def _mark_complete(db: AsyncSession, attempt_id: UUID, result: ScoringResult) -> None:
    await db.execute(update(Attempt).where(Attempt.id == attempt_id).values(status="complete"))
    logger.info("Pipeline complete: attempt=%s band=%.1f", attempt_id, result.estimated_band)
