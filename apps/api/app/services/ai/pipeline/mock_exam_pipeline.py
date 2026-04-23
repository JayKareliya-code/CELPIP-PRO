"""
Mock exam scoring pipeline — lightweight band-estimate only.

Intentionally separate from speaking_pipeline.py:
  • Different DB table (mock_exam_task_attempts, not attempts/speaking_attempts)
  • Different Celery queue (mock_exam, not speaking)
  • Produces only estimated_band — no rubric dimensions, no feedback report

Steps
-----
1. mark_processing   — status = 'processing'
2. load_attempt      — fetch MockExamTaskAttempt row, validate
3. load_prompt       — fetch prompt_text + context_image_url for scoring context
4. download_audio    — stream from S3 (mock-tests/ prefix)
5. transcribe        — Whisper STT (same provider as practice pipeline)
6. estimate_band     — lightweight GPT-4o-mini call: returns one float band score
7. save_result       — write estimated_band + scoring_model
8. mark_complete     — status = 'complete'
"""
from __future__ import annotations

import logging
from urllib.parse import urlparse
from uuid import UUID

import sqlalchemy as sa
from functools import lru_cache
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.mock_exam_attempt import MockExamTaskAttempt
from app.services.ai.providers.openai_provider import OpenAIProvider
from app.services.storage.presigner import download_from_s3, generate_presigned_get

logger = logging.getLogger(__name__)

# Tasks that have a context image — the LLM should know about it even for the
# band-estimate call so it doesn't penalise the candidate for describing a scene.
IMAGE_TASKS = frozenset({3, 4, 8})

# ── Session factory ────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_engine():
    """Return the shared async engine for this worker process.

    Created once per Celery worker — not once per scoring task.
    """
    return create_async_engine(
        settings.DATABASE_URL,
        future=True,
        pool_size=5,
        max_overflow=5,
        pool_pre_ping=True,
    )


async def run_mock_exam_pipeline(attempt_id: str) -> None:
    """Acquire a session from the process-wide engine and run the pipeline."""
    session_maker = async_sessionmaker(
        _get_engine(), expire_on_commit=False, autoflush=False
    )
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
    attempt = await _load_attempt(db, attempt_id)
    prompt_text, image_url = await _load_prompt(db, attempt.task_number, attempt.audio_s3_key)
    audio = await download_from_s3(attempt.audio_s3_key)
    transcript = await _transcribe(audio)
    band, model_used = await _estimate_band(transcript, prompt_text, attempt.task_number, image_url)
    await _save_result(db, attempt_id, band, model_used)
    await _mark_complete(db, attempt_id)
    logger.info("Mock exam pipeline complete: attempt=%s band=%.1f", attempt_id, band)


# ── Steps ──────────────────────────────────────────────────────────────────────

async def _mark_processing(db: AsyncSession, attempt_id: UUID) -> None:
    await db.execute(
        update(MockExamTaskAttempt)
        .where(MockExamTaskAttempt.id == attempt_id)
        .values(status="processing")
    )
    await db.flush()


async def _load_attempt(db: AsyncSession, attempt_id: UUID) -> MockExamTaskAttempt:
    attempt = await db.get(MockExamTaskAttempt, attempt_id)
    if not attempt:
        raise LookupError(f"MockExamTaskAttempt {attempt_id} not found")
    if not attempt.audio_s3_key:
        raise ValueError(f"MockExamTaskAttempt {attempt_id} has no audio_s3_key")
    return attempt


def _bare_s3_key(raw_url: str) -> str:
    """Strip bucket prefix + query params to get the bare S3 key.

    Handles the three URL formats the DB may store:
      1. Plain key:       "speaking-images/uuid.jpg"
      2. Full HTTPS URL:  "https://bucket.region.amazonaws.com/speaking-images/uuid.jpg"
      3. Presigned URL:   same as #2 but with ?X-Amz-... query params
    """
    parsed = urlparse(raw_url)
    if parsed.scheme:                     # full URL — strip host + query
        path = parsed.path.lstrip("/")
        from app.core.config import settings as _cfg
        bucket = _cfg.S3_BUCKET_NAME or ""
        if bucket and path.startswith(bucket + "/"):
            path = path[len(bucket) + 1:]
        return path
    return raw_url                        # already a bare key


async def _load_prompt(
    db: AsyncSession,
    task_number: int,
    audio_s3_key: str,  # noqa: ARG001 — reserved for future session-prompt join
) -> tuple[str, str | None]:
    """Return (prompt_text, presigned_image_url_or_None) for the given task.

    We fetch the most recent published mock prompt for this task so the model
    has the right context when scoring.  Image URL is presigned for 5 min.
    """
    row = (
        await db.execute(
            sa.text(
                "SELECT prompt_text, context_image_url FROM speaking_prompts "
                "WHERE task_number = :n AND status = 'published' AND is_active = TRUE "
                "  AND prompt_tag = 'mock' "
                "ORDER BY sort_order, created_at DESC LIMIT 1"
            ),
            {"n": task_number},
        )
    ).mappings().one_or_none()

    if not row:
        # Graceful fallback — score without prompt context
        logger.warning("No mock prompt found for task %d; scoring without context", task_number)
        return ("", None)

    prompt_text: str = row["prompt_text"] or ""
    raw_image_url: str | None = row["context_image_url"]
    image_url: str | None = None

    if raw_image_url and task_number in IMAGE_TASKS:
        try:
            s3_key = _bare_s3_key(raw_image_url)
            image_url = generate_presigned_get(key=s3_key, expires_in=300)
        except Exception:
            logger.warning("Could not presign image for task %d", task_number, exc_info=True)
            image_url = raw_image_url

    return prompt_text, image_url


async def _transcribe(audio: bytes) -> str:
    """Run Whisper STT and return transcript text.

    No cost-log entry here — mock exam tasks don't write to the ai_cost_log
    table (which is keyed to attempts.id).  Cost tracking for mock exams is
    deferred to Phase 3.
    """
    provider = OpenAIProvider()
    try:
        text, _ = await provider.transcribe(audio)
    finally:
        await provider.aclose()
    logger.debug("Transcribed %d chars", len(text))
    return text


_BAND_ESTIMATOR_SYSTEM = """You are a certified CELPIP speaking examiner.
Given a candidate's transcript and the task prompt, return ONLY a JSON object
with one key: "estimated_band" — a float from 1.0 to 12.0 in 0.5 steps
representing the overall CELPIP speaking band score.

Scoring criteria:
- Task completion (did they address the prompt?)
- Coherence and organisation
- Vocabulary appropriateness
- Fluency (no excessive pauses implied by transcription gaps)
- Grammatical accuracy

Return strictly: {"estimated_band": <float>}"""


async def _estimate_band(
    transcript: str,
    prompt_text: str,
    task_number: int,
    image_url: str | None,
) -> tuple[float, str]:
    """Call the LLM with a lightweight prompt that returns only estimated_band.

    Uses vision model for image tasks (3/4/8) so the model can cross-check
    whether the candidate actually described the scene shown to them.
    Falls back to text-only model for all other tasks.
    """
    provider = OpenAIProvider()
    use_vision = bool(task_number in IMAGE_TASKS and image_url)
    model = settings.AI_VISION_SCORING_MODEL if use_vision else settings.AI_SCORING_MODEL

    text_content = (
        f"Task {task_number} prompt: {prompt_text}\n\n"
        f"Candidate transcript:\n{transcript or '[no audio transcribed]'}"
    )

    if use_vision:
        user_content: str | list = [
            {"type": "text",      "text": text_content},
            {"type": "image_url", "image_url": {"url": image_url, "detail": "auto"}},
        ]
    else:
        user_content = text_content

    payload = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": _BAND_ESTIMATOR_SYSTEM},
            {"role": "user",   "content": user_content},
        ],
        "max_tokens": 50,
        "temperature": 0.1,
    }

    try:
        import json
        resp = await provider._client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        body = resp.json()
        data = json.loads(body["choices"][0]["message"]["content"])
        band = float(data.get("estimated_band", 0))
        # Clamp to valid CELPIP range in 0.5 steps
        band = max(1.0, min(12.0, round(band * 2) / 2))
    except Exception:
        logger.exception("Band estimation failed for task %d; defaulting to 0", task_number)
        band = 0.0
    finally:
        await provider.aclose()

    return band, model


async def _save_result(
    db: AsyncSession,
    attempt_id: UUID,
    estimated_band: float,
    scoring_model: str,
) -> None:
    await db.execute(
        update(MockExamTaskAttempt)
        .where(MockExamTaskAttempt.id == attempt_id)
        .values(estimated_band=estimated_band, scoring_model=scoring_model)
    )
    await db.flush()


async def _mark_complete(db: AsyncSession, attempt_id: UUID) -> None:
    await db.execute(
        update(MockExamTaskAttempt)
        .where(MockExamTaskAttempt.id == attempt_id)
        .values(status="complete")
    )
    await db.flush()
