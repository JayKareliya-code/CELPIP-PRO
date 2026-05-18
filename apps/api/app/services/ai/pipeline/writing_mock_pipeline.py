"""
Writing mock-exam scoring pipeline — band-only output, single-call method.

Stage 0 — load     : fetch attempt, essay, prompt
Stage 1 — score    : single gpt-4o call (same rubric as practice)
Stage 2 — persist  : write ScoreReport with estimated_band + likely_range ONLY.
                     No ScoreDimension, no FeedbackReport.

Why no coach/feedback stage?
----------------------------
Mock exams simulate the real CELPIP test — the candidate sees only the overall
band, no examiner feedback. We still run the full scoring call (rubric + tips +
sample) because gpt-4o produces them in a single response anyway; we simply
discard the coaching fields.

Fail-soft contract
------------------
If the scoring call fails after all retries, the pipeline saves
ScoreReport.estimated_band = NULL so the UI can render "scoring unavailable —
please retry" instead of a misleading band=0.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.attempt import Attempt, WritingAttempt
from app.models.score_report import ScoreReport
from app.services.ai.base import ScoringResult
from app.services.ai.cost_tracker import log_cost
from app.services.ai.providers.openai_provider import OpenAIProvider
from app.services.ai.rubric.writing_rubric import build_writing_system_prompt

logger = logging.getLogger(__name__)

# Same schema version as the practice pipeline so admin tools can read both.
SCHEMA_VERSION = 2


# ── Session factory ────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_engine():
    return create_async_engine(
        settings.DATABASE_URL,
        future=True,
        pool_size=3,
        max_overflow=5,
        pool_pre_ping=True,
        pool_recycle=1800,  # managed PG drops idle connections; recycle every 30 min
    )


async def run_writing_mock_pipeline(attempt_id: str) -> None:
    session_maker = async_sessionmaker(_get_engine(), expire_on_commit=False, autoflush=False)
    async with session_maker() as db:
        try:
            await _pipeline(db, UUID(attempt_id))
            await db.commit()
        except Exception:
            await db.rollback()
            raise


# ── Orchestrator ───────────────────────────────────────────────────────────────

async def _pipeline(db: AsyncSession, attempt_id: UUID) -> None:
    # Idempotency: see writing_pipeline._pipeline. If a ScoreReport already
    # exists for this attempt, finalise the status and exit instead of
    # re-running the LLM call.
    from sqlalchemy import select as _select  # local to avoid touching imports
    existing = await db.execute(
        _select(ScoreReport.id).where(ScoreReport.attempt_id == attempt_id)
    )
    if existing.scalar_one_or_none() is not None:
        logger.info(
            "writing_mock_pipeline: ScoreReport already exists for attempt=%s — "
            "skipping rescore and finalising status",
            attempt_id,
        )
        await _mark_complete(db, attempt_id)
        return

    await _mark_processing(db, attempt_id)
    attempt, w_attempt = await _load_attempt(db, attempt_id)
    prompt_text, task_number = await _load_prompt(db, attempt.prompt_id)

    result = await _score_failsoft(
        db=db,
        attempt_id=attempt_id,
        essay_text=w_attempt.essay_text or "",
        prompt_text=prompt_text,
        task_number=task_number,
    )

    if result is None:
        await _save_result(
            db, attempt_id,
            estimated_band=None,
            likely_range=None,
            raw_rubric_json={"score_error": True},
        )
        await _mark_complete(db, attempt_id)
        logger.warning("Mock pipeline saved NULL band: attempt=%s", attempt_id)
        return

    await _save_result(
        db, attempt_id,
        estimated_band=result.estimated_band,
        likely_range=result.likely_range or None,
        raw_rubric_json=result.raw_json,
    )
    await _mark_complete(db, attempt_id)
    logger.info(
        "Mock pipeline complete: attempt=%s band=%d range=%s",
        attempt_id, result.estimated_band, result.likely_range,
    )


# ── Stage 0: load ──────────────────────────────────────────────────────────────

async def _mark_processing(db: AsyncSession, attempt_id: UUID) -> None:
    await db.execute(
        update(Attempt).where(Attempt.id == attempt_id).values(status="processing")
    )
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


# ── Stage 1: scoring call ────────────────────────────────────────────────────

async def _score_failsoft(
    *,
    db: AsyncSession,
    attempt_id: UUID,
    essay_text: str,
    prompt_text: str,
    task_number: int,
) -> ScoringResult | None:
    """Score the essay; never propagate exceptions to the caller — return None
    on persistent failure so the pipeline can save NULL band."""
    system_prompt = build_writing_system_prompt(task_number=task_number, target_band=None)

    provider = OpenAIProvider()
    try:
        try:
            result = await provider.score_writing(
                essay_text=essay_text,
                prompt_text=prompt_text,
                system_prompt=system_prompt,
            )
        except Exception as exc:
            logger.error(
                "Mock scoring call failed (all retries exhausted): attempt=%s err=%s",
                attempt_id, exc,
            )
            return None
        try:
            await log_cost(db, attempt_id, "openai", settings.AI_WRITING_MODEL, "scoring", result.usage)
        except Exception:
            logger.exception("Mock cost logging failed: attempt=%s", attempt_id)
        return result
    finally:
        await provider.aclose()


# ── Stage 2: persist + complete ────────────────────────────────────────────────

async def _save_result(
    db: AsyncSession,
    attempt_id: UUID,
    *,
    estimated_band: int | None,
    likely_range: str | None,
    raw_rubric_json: dict | None,
) -> None:
    """Write the ScoreReport with band + audit only (no dimensions, no feedback).

    estimated_band=NULL means the scoring run failed; the UI distinguishes this
    from band=0.
    """
    report = ScoreReport(
        attempt_id=attempt_id,
        estimated_band=estimated_band,
        scoring_model=settings.AI_WRITING_MODEL,
        raw_rubric_json=raw_rubric_json,
        schema_version=SCHEMA_VERSION,
        likely_range=likely_range or None,
    )
    db.add(report)
    await db.flush()


async def _mark_complete(db: AsyncSession, attempt_id: UUID) -> None:
    await db.execute(
        update(Attempt).where(Attempt.id == attempt_id).values(status="complete")
    )
    await db.flush()
