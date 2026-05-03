"""
Speaking scoring pipeline — all business logic for one speaking attempt.

Steps
-----
1. mark_processing   — set status = 'processing'
2. load_attempt      — fetch Attempt + SpeakingAttempt, validate
3. load_prompt       — fetch prompt_text, task_number, context_image_url
4. download_audio    — stream audio from S3
5. transcribe        — Whisper STT, save Transcript, log cost
6. build_prompt      — assemble rubric system prompt (+ calibration + image addendum)
7. score             — GPT-4o[-mini] scoring (vision path for tasks 3/4/8), log cost
8. save_score        — persist ScoreReport + ScoreDimension rows
9. save_feedback     — persist FeedbackReport
10. mark_complete    — set status = 'complete'

Image-task behaviour
--------------------
Tasks 3, 4, 8 pass the scene image URL into step 7 so the model can verify
the candidate described the actual scene.  GPT-4o is used automatically;
text-only tasks always use the cheaper GPT-4o-mini.
"""
from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from uuid import UUID

import sqlalchemy as sa
from functools import lru_cache
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.attempt import Attempt, SpeakingAttempt
from app.models.feedback_report import FeedbackReport
from app.models.score_report import ScoreReport, ScoreDimension
from app.models.transcript import Transcript
from app.services.ai.base import ScoringResult
from app.services.ai.calibration import build_calibration_context
from app.services.ai.cost_tracker import log_cost
from app.services.ai.providers.openai_provider import OpenAIProvider
from app.services.ai.rubric.speaking_rubric import IMAGE_TASKS, build_speaking_system_prompt
from app.services.storage.presigner import download_from_s3, generate_presigned_get

logger = logging.getLogger(__name__)

# Official CELPIP 4-dimension model (schema v2)
DIMENSIONS = ["content_coherence", "vocabulary", "listenability", "task_fulfillment"]
SCHEMA_VERSION = 2


@dataclass(slots=True)
class PromptContext:
    prompt_text:          str
    task_number:          int
    context_image_url:    str | None
    # Calibration anchor — Band 12 sample stored on this specific prompt row.
    # Empty string means no anchor set; pipeline falls back to global pool.
    sample_response_text: str = ""
    # Used to scale the anchor truncation limit (response_time_seconds × 5 chars).
    response_time_seconds: int = 60

    @property
    def is_image_task(self) -> bool:
        return self.task_number in IMAGE_TASKS

    @property
    def scoring_model(self) -> str:
        """Return the correct model slug based on whether a scene image is present."""
        return (
            settings.AI_VISION_SCORING_MODEL
            if self.is_image_task and self.context_image_url
            else settings.AI_SCORING_MODEL
        )

    @property
    def calibration_max_chars(self) -> int:
        """Character budget for the prompt-specific Band 12 anchor.

        Scales with response_time_seconds so longer tasks get more context.
        E.g. 60s × 5 = 300 chars; 90s × 5 = 450 chars.
        A minimum of 400 chars is enforced so very short tasks still get
        a meaningful calibration snippet.
        """
        return max(400, self.response_time_seconds * 5)


# ── Session factory ─────────────────────────────────────────────────────────

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


async def run_speaking_pipeline(attempt_id: str) -> None:
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
    attempt, s_attempt = await _load_attempt(db, attempt_id)
    target_band = await _load_user_target_band(db, attempt.user_id)
    ctx = await _load_prompt(db, attempt.prompt_id)
    audio = await download_from_s3(s_attempt.audio_s3_key)
    transcript = await _transcribe(db, attempt_id, audio)
    system_prompt = await _build_prompt(db, ctx, target_band)
    result = await _score(db, attempt_id, transcript, ctx, system_prompt)
    await _save_score(db, attempt_id, result, actual_model=ctx.scoring_model)
    await _save_feedback(db, attempt_id, result)
    await _mark_complete(db, attempt_id, result)


# ── Steps ─────────────────────────────────────────────────────────────────────

async def _mark_processing(db: AsyncSession, attempt_id: UUID) -> None:
    await db.execute(update(Attempt).where(Attempt.id == attempt_id).values(status="processing"))
    await db.flush()


async def _load_attempt(db: AsyncSession, attempt_id: UUID) -> tuple[Attempt, SpeakingAttempt]:
    attempt = await db.get(Attempt, attempt_id)
    if not attempt:
        raise LookupError(f"Attempt {attempt_id} not found")
    s_attempt = await db.get(SpeakingAttempt, attempt_id)
    if not s_attempt:
        raise LookupError(f"SpeakingAttempt {attempt_id} not found")
    if not s_attempt.audio_s3_key:
        raise ValueError(f"SpeakingAttempt {attempt_id} has no audio_s3_key")
    return attempt, s_attempt


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


async def _load_prompt(db: AsyncSession, prompt_id: UUID) -> PromptContext:
    row = (
        await db.execute(
            sa.text(
                "SELECT prompt_text, task_number, context_image_url, "
                "       sample_response_text, response_time_seconds "
                "FROM speaking_prompts WHERE id=:id"
            ),
            {"id": prompt_id},
        )
    ).mappings().one_or_none()
    if not row:
        raise LookupError(f"Prompt {prompt_id} not found")

    # The DB stores a plain (private) S3/R2 URL.  OpenAI's vision API must be
    # able to fetch the image, so we generate a short-lived presigned GET URL.
    # If no image is set (text-only task) we leave it as None.
    raw_image_url: str | None = row["context_image_url"]
    if raw_image_url:
        try:
            # Extract the bare S3 key from the stored URL (strips bucket prefix / query params)
            from app.api.v1._prompt_helpers import extract_s3_key  # local import to avoid circular dep
            s3_key = extract_s3_key(raw_image_url)
            image_url: str | None = generate_presigned_get(key=s3_key, expires_in=300)
        except Exception:
            logger.warning("Could not presign context_image_url; falling back to stored URL", exc_info=True)
            image_url = raw_image_url
    else:
        image_url = None

    ctx = PromptContext(
        prompt_text=row["prompt_text"],
        task_number=row["task_number"],
        context_image_url=image_url,
        sample_response_text=row["sample_response_text"] or "",
        response_time_seconds=row["response_time_seconds"] or 60,
    )
    logger.info(
        "Prompt loaded: task=%d image_task=%s has_band12_anchor=%s",
        ctx.task_number,
        ctx.is_image_task,
        bool(ctx.sample_response_text),
    )
    return ctx


async def _transcribe(db: AsyncSession, attempt_id: UUID, audio: bytes) -> str:
    provider = OpenAIProvider()
    try:
        text, usage = await provider.transcribe(audio)
        # Persist before closing so a hypothetical aclose() error doesn't skip the write.
        db.add(Transcript(attempt_id=attempt_id, text=text, provider="openai", confidence_score=None))
        await log_cost(db, attempt_id, "openai", settings.AI_STT_MODEL, "stt", usage)
    finally:
        await provider.aclose()
    logger.info("Transcribed: attempt=%s chars=%d", attempt_id, len(text))
    return text


async def _build_prompt(db: AsyncSession, ctx: PromptContext, target_band: float | None = None) -> str:
    calibration = await build_calibration_context(
        db,
        skill="speaking",
        task_number=ctx.task_number,
        prompt_band12_sample=ctx.sample_response_text or None,
        max_chars=ctx.calibration_max_chars,
    )
    return build_speaking_system_prompt(
        calibration_block=calibration,
        task_number=ctx.task_number,
        target_band=target_band,
    )


async def _score(
    db: AsyncSession,
    attempt_id: UUID,
    transcript: str,
    ctx: PromptContext,
    system_prompt: str,
) -> ScoringResult:
    provider = OpenAIProvider()
    try:
        result = await provider.score_speaking(
            transcript=transcript,
            prompt_text=ctx.prompt_text,
            system_prompt=system_prompt,
            context_image_url=ctx.context_image_url,
        )
    finally:
        await provider.aclose()
    await log_cost(db, attempt_id, "openai", ctx.scoring_model, "scoring", result.usage)
    logger.info("Scored: attempt=%s band=%.1f model=%s", attempt_id, result.estimated_band, ctx.scoring_model)
    return result


async def _save_score(
    db: AsyncSession,
    attempt_id: UUID,
    result: ScoringResult,
    actual_model: str,
) -> None:
    """Persist ScoreReport using the model that was *actually* used for this call.

    Vision tasks (3/4/8) use gpt-4o; text-only tasks use gpt-4o-mini.
    Recording the actual model here is important for cost auditing.
    schema_version=2 identifies this as the official CELPIP 4-dimension model.
    """
    report = ScoreReport(
        attempt_id=attempt_id,
        estimated_band=result.estimated_band,
        scoring_model=actual_model,   # reflects gpt-4o for vision tasks
        raw_rubric_json=result.raw_json,
        schema_version=SCHEMA_VERSION,
        likely_range=result.likely_range or None,
    )
    db.add(report)
    await db.flush()
    for dim in DIMENSIONS:
        db.add(ScoreDimension(report_id=report.id, dimension=dim, score=getattr(result, dim, 0), max_score=12))


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
