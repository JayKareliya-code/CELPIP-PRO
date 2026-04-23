"""
Writing mock exam scoring pipeline — lightweight band-estimate only.

Intentionally separate from writing_pipeline.py:
  • Different Celery queue  (writing_mock, not writing)
  • Produces only estimated_band — no rubric dimensions, no feedback report
  • Links to the session via session_id stored in Attempt.session_id

Steps
-----
1. mark_processing   — status = 'processing'
2. load_attempt      — fetch Attempt + WritingAttempt, validate essay_text
3. load_prompt       — fetch prompt_text + task_number from writing_prompts
4. estimate_band     — lightweight GPT-4o-mini call: returns one float band score
                       Retries up to 3× with exponential backoff on 429.
5. save_result       — write estimated_band + scoring_model to ScoreReport
6. mark_complete     — status = 'complete'

Writing mock skips rubric dimensions, calibration, feedback, and cost logging
(identical to how mock_exam_pipeline.py handles speaking mock tasks).
"""
from __future__ import annotations

import asyncio
import json
import logging
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import update
from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.attempt import Attempt, WritingAttempt
from app.models.score_report import ScoreReport
from app.services.ai.providers.openai_provider import OpenAIProvider

logger = logging.getLogger(__name__)

# ── Session factory ────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_engine():
    """Return the shared async engine for this worker process.

    @lru_cache is safe here because each Celery ForkPoolWorker runs on a
    single persistent event loop (see app.core.async_worker).  The engine is
    created once per worker process and reused across tasks, which avoids
    both the per-task connection overhead and the 'Future attached to a
    different loop' error that occurs when asyncio.run() creates a new loop.
    """
    return create_async_engine(
        settings.DATABASE_URL,
        future=True,
        pool_size=2,
        max_overflow=2,
        pool_pre_ping=True,
    )


async def run_writing_mock_pipeline(attempt_id: str) -> None:
    """Acquire a session from the process-wide engine and run the pipeline."""
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
    await _mark_processing(db, attempt_id)
    attempt, w_attempt  = await _load_attempt(db, attempt_id)
    prompt_text, task_number = await _load_prompt(db, attempt.prompt_id)
    band, model_used    = await _estimate_band(
        essay_text=w_attempt.essay_text or "",
        prompt_text=prompt_text,
        task_number=task_number,
    )
    await _save_result(db, attempt_id, band, model_used)
    await _mark_complete(db, attempt_id)
    logger.info("Writing mock pipeline complete: attempt=%s band=%.1f", attempt_id, band)


# ── Steps ──────────────────────────────────────────────────────────────────────

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


# ── Band estimator ─────────────────────────────────────────────────────────────

_BAND_ESTIMATOR_SYSTEM = """\
You are a certified CELPIP writing examiner.
Given a candidate's essay and the task prompt, return ONLY a JSON object
with one key: "estimated_band" — a float from 1.0 to 12.0 in 0.5 steps
representing the overall CELPIP writing band score.

Scoring criteria:
- Task fulfillment (did they address all required points?)
- Organization and coherence
- Appropriate tone and register
- Vocabulary range and accuracy
- Grammatical accuracy and complexity

Return strictly: {"estimated_band": <float>}"""


async def _estimate_band(
    essay_text:  str,
    prompt_text: str,
    task_number:  int,
) -> tuple[float | None, str]:
    """Lightweight LLM call — returns a single band score, no dimensions.

    Retries up to AI_MAX_RETRIES times on HTTP 429 (rate-limit) with
    exponential backoff, honouring the Retry-After header when present.
    All other HTTP errors are re-raised immediately.
    Returns (None, model) on permanent failure so callers can store NULL
    instead of a misleading band=0.
    """
    provider = OpenAIProvider()
    model    = settings.AI_SCORING_MODEL

    user_content = (
        f"Task {task_number} prompt:\n{prompt_text}\n\n"
        f"Candidate essay:\n{essay_text or '[no essay submitted]'}"
    )

    payload = {
        "model":           model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": _BAND_ESTIMATOR_SYSTEM},
            {"role": "user",   "content": user_content},
        ],
        "max_tokens": 50,
        "temperature": 0.1,
    }

    max_retries = settings.AI_MAX_RETRIES  # default 3, configurable in .env
    last_exc: Exception | None = None

    try:
        for attempt_num in range(max_retries):
            try:
                resp = await provider._client.post("/chat/completions", json=payload)

                # Handle rate-limit: back off then retry
                if resp.status_code == 429:
                    retry_after = float(resp.headers.get("Retry-After", 2 ** attempt_num))
                    wait = min(retry_after, 60.0)  # cap at 60s
                    logger.warning(
                        "OpenAI 429 for task %d (attempt %d/%d). Waiting %.1fs before retry.",
                        task_number, attempt_num + 1, max_retries, wait,
                    )
                    await asyncio.sleep(wait)
                    last_exc = Exception(f"429 Too Many Requests after {attempt_num + 1} attempts")
                    continue

                # All other HTTP errors surface immediately (no retry)
                resp.raise_for_status()

                body = resp.json()
                data = json.loads(body["choices"][0]["message"]["content"])
                band = float(data.get("estimated_band", 0))
                # Clamp to valid CELPIP range in 0.5 steps
                band = max(1.0, min(12.0, round(band * 2) / 2))
                return band, model  # success — exit retry loop

            except Exception as exc:
                if "429" in str(exc) or "Too Many Requests" in str(exc):
                    # Raised by raise_for_status() on a 429 — same backoff
                    wait = 2.0 ** attempt_num
                    logger.warning(
                        "OpenAI 429 exception for task %d (attempt %d/%d). Waiting %.1fs.",
                        task_number, attempt_num + 1, max_retries, wait,
                    )
                    await asyncio.sleep(wait)
                    last_exc = exc
                    continue
                # Non-retriable error — log and return None
                logger.exception(
                    "Band estimation failed (non-retriable) for task %d", task_number
                )
                return None, model

        # Exhausted all retries
        logger.error(
            "Band estimation failed for task %d after %d retries: %s",
            task_number, max_retries, last_exc,
        )
        return None, model

    finally:
        await provider.aclose()


# ── Persist ────────────────────────────────────────────────────────────────────

async def _save_result(
    db:              AsyncSession,
    attempt_id:      UUID,
    estimated_band:  float | None,
    scoring_model:   str,
) -> None:
    """Write a ScoreReport with just the band estimate — no dimensions.

    estimated_band is stored as NULL when scoring failed (e.g. persistent
    rate-limit) so the UI can distinguish 'failed to score' from 'band = 0'.
    """
    report = ScoreReport(
        attempt_id=attempt_id,
        estimated_band=estimated_band,  # None = scoring unavailable
        scoring_model=scoring_model,
        raw_rubric_json=None,
    )
    db.add(report)
    await db.flush()


async def _mark_complete(db: AsyncSession, attempt_id: UUID) -> None:
    await db.execute(
        update(Attempt).where(Attempt.id == attempt_id).values(status="complete")
    )
    await db.flush()
