"""
Writing scoring pipeline — single-call method.

Stage 0 — load        : fetch attempt, essay, prompt, target band
Stage 1 — score       : single gpt-4o call producing scores + feedback + sample
Stage 2 — persist     : write ScoreReport + ScoreDimension + FeedbackReport

The scoring rubric (see app.services.ai.rubric.writing_rubric) carries inline
Band 6-12 CELPIP calibration anchors and the weighted-score formula directly
in the system prompt, so a separate judge/coach split is no longer needed for
accurate calibration.
"""
from __future__ import annotations

import logging
from dataclasses import asdict
from functools import lru_cache
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.attempt import Attempt, WritingAttempt
from app.models.feedback_report import FeedbackReport
from app.models.score_report import ScoreReport, ScoreDimension
from app.services.ai.base import ScoringResult
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
    """Return the shared async engine for this worker process."""
    return create_async_engine(
        settings.DATABASE_URL,
        future=True,
        pool_size=3,
        max_overflow=5,
        pool_pre_ping=True,
        pool_recycle=1800,  # managed PG drops idle connections; recycle every 30 min
    )


async def run_writing_pipeline(attempt_id: str) -> None:
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
    # Idempotency: a previous run may have already persisted a ScoreReport and
    # then crashed before marking the attempt complete (e.g. a Celery worker
    # SIGKILL after commit), or this is a retry after a transient error. In
    # either case re-running the OpenAI call would (a) double-charge tokens
    # and (b) blow up on the ScoreReport.attempt_id UNIQUE constraint. If the
    # report already exists, just mark the attempt complete and exit.
    existing = await db.execute(
        sa.select(ScoreReport.id, ScoreReport.estimated_band)
        .where(ScoreReport.attempt_id == attempt_id)
    )
    prev = existing.first()
    if prev is not None:
        logger.info(
            "writing_pipeline: ScoreReport already exists for attempt=%s — "
            "skipping rescore and finalising status",
            attempt_id,
        )
        await db.execute(
            update(Attempt).where(Attempt.id == attempt_id).values(status="complete")
        )
        return

    await _mark_processing(db, attempt_id)
    attempt, w_attempt = await _load_attempt(db, attempt_id)
    prompt_text, task_number = await _load_prompt(db, attempt.prompt_id)
    target_band = await _load_user_target_band(db, attempt.user_id)

    result = await _score(
        db=db,
        attempt_id=attempt_id,
        essay_text=w_attempt.essay_text,
        prompt_text=prompt_text,
        task_number=task_number,
        target_band=target_band,
    )

    await _save_score(db, attempt_id, result)
    await _save_feedback(db, attempt_id, result)
    await _mark_complete(db, attempt_id, result)


# ── Stage 0: load ─────────────────────────────────────────────────────────────

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
    if not (w_attempt.essay_text or "").strip():
        raise ValueError(f"WritingAttempt {attempt_id} has empty essay_text")
    return attempt, w_attempt


async def _load_prompt(db: AsyncSession, prompt_id: UUID) -> tuple[str, int]:
    row = (
        await db.execute(
            sa.text(
                "SELECT prompt_text, task_number FROM writing_prompts WHERE id = :pid"
            ),
            {"pid": prompt_id},
        )
    ).mappings().one_or_none()
    if row is None:
        raise LookupError(f"Writing prompt {prompt_id} not found")
    return row["prompt_text"], row["task_number"]


async def _load_user_target_band(db: AsyncSession, user_id: UUID) -> float | None:
    row = (
        await db.execute(
            sa.text("SELECT target_band FROM users WHERE id = :uid"),
            {"uid": user_id},
        )
    ).mappings().one_or_none()
    band = float(row["target_band"]) if row and row["target_band"] is not None else None
    logger.info("User target_band: %s", band)
    return band


# ── Stage 1: scoring call ────────────────────────────────────────────────────

async def _score(
    *,
    db: AsyncSession,
    attempt_id: UUID,
    essay_text: str,
    prompt_text: str,
    task_number: int,
    target_band: float | None,
) -> ScoringResult:
    system_prompt = build_writing_system_prompt(
        task_number=task_number,
        target_band=target_band,
    )
    provider = OpenAIProvider()
    try:
        result = await provider.score_writing(
            essay_text=essay_text,
            prompt_text=prompt_text,
            system_prompt=system_prompt,
        )
    finally:
        await provider.aclose()
    await log_cost(db, attempt_id, "openai", settings.AI_WRITING_MODEL, "scoring", result.usage)
    return result


# ── Stage 2: persist ──────────────────────────────────────────────────────────

async def _save_score(
    db: AsyncSession,
    attempt_id: UUID,
    result: ScoringResult,
) -> None:
    """Persist ScoreReport + per-dimension rows."""
    report = ScoreReport(
        attempt_id=attempt_id,
        estimated_band=result.estimated_band,
        scoring_model=settings.AI_WRITING_MODEL,
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
    logger.info("Pipeline complete: attempt=%s band=%d", attempt_id, result.estimated_band)
