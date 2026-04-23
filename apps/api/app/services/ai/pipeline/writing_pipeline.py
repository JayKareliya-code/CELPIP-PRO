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

WRITING_DIMENSIONS = [
    "task_fulfillment",
    "organization",
    "tone_register",
    "vocabulary",
    "grammar",
]


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
    attempt, w_attempt  = await _load_attempt(db, attempt_id)
    prompt_text, task_number = await _load_prompt(db, attempt.prompt_id)
    target_band         = await _load_user_target_band(db, attempt.user_id)
    system_prompt       = await _build_prompt(db, task_number, target_band)
    result              = await _score(db, attempt_id, w_attempt.essay_text, prompt_text, system_prompt)
    await _save_score(db, attempt_id, result)
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


async def _load_prompt(db: AsyncSession, prompt_id: UUID) -> tuple[str, int]:
    """Return (prompt_text, task_number) for the writing prompt."""
    row = (
        await db.execute(
            sa.text("SELECT prompt_text, task_number FROM writing_prompts WHERE id = :pid"),
            {"pid": prompt_id},
        )
    ).mappings().one_or_none()
    if row is None:
        raise LookupError(f"Writing prompt {prompt_id} not found")
    return row["prompt_text"], row["task_number"]


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
) -> str:
    calibration = await build_calibration_context(db, skill="writing", task_number=task_number)
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


async def _save_score(db: AsyncSession, attempt_id: UUID, result: ScoringResult) -> None:
    report = ScoreReport(
        attempt_id=attempt_id,
        estimated_band=result.estimated_band,
        scoring_model=settings.AI_SCORING_MODEL,
        raw_rubric_json=result.raw_json,
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
        strengths=result.strengths,
        weaknesses=result.weaknesses,
        improvement_tips=result.improvement_tips,
        sample_response=result.sample_response,
    ))


async def _mark_complete(db: AsyncSession, attempt_id: UUID, result: ScoringResult) -> None:
    await db.execute(update(Attempt).where(Attempt.id == attempt_id).values(status="complete"))
    logger.info("Pipeline complete: attempt=%s band=%.1f", attempt_id, result.estimated_band)
