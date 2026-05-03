"""
Calibration context builder.

Fetches active calibration samples from the DB and formats them as a text
block for injection into the scoring system prompt.

Design decisions:
  - We pull at most 4 samples per call to cap prompt token growth.
  - Samples with NULL task_number apply to all tasks (global calibration).
  - Task-specific samples for the exact task_number are included too.
  - Failure (e.g. DB timeout) is non-fatal: we log a warning and return "",
    so the scoring pipeline continues without calibration context.
"""
from __future__ import annotations

import logging

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.calibration import CalibrationSample

logger = logging.getLogger(__name__)

_MAX_SAMPLES = 4          # max calibration examples injected per scoring call
_MAX_SAMPLE_CHARS = 400   # truncation for global pool samples
_DEFAULT_PROMPT_ANCHOR_CHARS = 800  # default when no time-based limit is given
_MAX_PROMPT_ANCHOR_CHARS = 2000     # ceiling — prevents token waste on very long tasks


async def build_calibration_context(
    db: AsyncSession,
    skill: str,
    task_number: int | None,
    prompt_band12_sample: str | None = None,
    max_chars: int | None = None,
) -> str:
    """Fetch active calibration samples and return a formatted block for prompt injection.

    Priority logic:
      1. If ``prompt_band12_sample`` is provided (non-empty), inject it as a
         **Prompt-Specific Band 12 Reference** and return immediately — the
         global ``calibration_samples`` pool is skipped entirely.  This gives
         the LLM the most relevant possible anchor: an ideal answer written for
         the *exact* prompt the candidate answered.
      2. If no prompt-specific sample exists, fall back to the global pool
         (existing behaviour — up to 4 samples ordered by band_level DESC).

    Args:
        db:                    Async SQLAlchemy session.
        skill:                 "speaking" or "writing".
        task_number:           The specific task number (0–8 for speaking,
                               1–2 for writing).  Pass None to retrieve only
                               global (task_number IS NULL) samples.
        prompt_band12_sample:  The Band 12 sample text stored on the prompt row
                               (``sample_response_text`` column).  Pass None or
                               "" to fall back to the global pool.
        max_chars:             Maximum characters to include from the prompt-
                               specific anchor.  Defaults to
                               _DEFAULT_PROMPT_ANCHOR_CHARS (800).  Callers
                               should pass ``response_time_seconds * 5`` (or
                               ``time_limit_seconds * N``) to let the limit
                               scale with the expected response length.

    Returns:
        A formatted multi-line string, or "" if no samples are found.
    """
    # ── Path 1: Prompt-specific Band 12 anchor ────────────────────────────────
    if prompt_band12_sample and prompt_band12_sample.strip():
        raw_limit = max_chars if max_chars and max_chars > 0 else _DEFAULT_PROMPT_ANCHOR_CHARS
        # Cap the anchor to avoid token waste while keeping it meaningful.
        # Floor: 600 chars — minimum for the anchor to show real structure.
        # Ceiling: 2000 chars — prevents oversized prompts on long writing tasks.
        limit = min(max(600, raw_limit), _MAX_PROMPT_ANCHOR_CHARS)
        text = prompt_band12_sample.strip()
        truncated = text[:limit]
        if len(text) > limit:
            truncated += "…"

        logger.debug(
            "Injecting prompt-specific Band 12 anchor (%d chars) for skill=%s task=%s",
            len(truncated),
            skill,
            task_number,
        )
        return (
            "### Prompt-Specific Band 12 Reference\n"
            "The following is a Band 12 answer for THE EXACT PROMPT the candidate answered.\n"
            "It represents the CEILING — the maximum possible score for any dimension.\n\n"
            f"**Band 12 Reference Answer:**\n{truncated}\n\n"
            "### How to use this reference when scoring\n"
            "Use this reference to calibrate ALL FOUR dimensions:\n"
            "- **Content/Coherence**: If the candidate develops fewer ideas, uses less\n"
            "  specific details, or has weaker organization than this reference, their\n"
            "  Content/Coherence score MUST be proportionally lower than 12.\n"
            "- **Vocabulary**: If the candidate's word choice is simpler, more repetitive,\n"
            "  or less precise than this reference, their Vocabulary score MUST be lower.\n"
            "- **Listenability / Readability**: If the candidate's delivery or writing\n"
            "  is less fluent, less structured, or has more errors, score lower.\n"
            "- **Task Fulfillment**: If the candidate misses requirements that this reference\n"
            "  addresses, deduct at least 2 bands from Task Fulfillment.\n\n"
            "A response that is noticeably weaker than this Band 12 text on a dimension\n"
            "cannot receive a score above 9 on that dimension.\n"
            "DO NOT copy or paraphrase this reference in feedback or sample_response."
        )

    # ── Path 2: Global calibration pool (fallback) ────────────────────────────
    try:
        stmt = (
            select(CalibrationSample)
            .where(CalibrationSample.skill == skill)
            .where(CalibrationSample.is_active.is_(True))
            .where(
                or_(
                    CalibrationSample.task_number == task_number,
                    CalibrationSample.task_number.is_(None),
                )
            )
            .order_by(CalibrationSample.band_level.desc())  # highest band first
            .limit(_MAX_SAMPLES)
        )

        result = await db.execute(stmt)
        samples = result.scalars().all()

        if not samples:
            logger.debug(
                "No calibration samples found for skill=%s task_number=%s",
                skill,
                task_number,
            )
            return ""

        lines = ["### Reference Examples (use as calibration anchors — do NOT copy verbatim)"]
        for sample in samples:
            truncated = sample.sample_text[:_MAX_SAMPLE_CHARS]
            if len(sample.sample_text) > _MAX_SAMPLE_CHARS:
                truncated += "..."
            lines.append(f"\n**Band {sample.band_level:.0f} Example:**\n{truncated}")

        logger.debug(
            "Injecting %d global calibration samples for skill=%s task=%s",
            len(samples),
            skill,
            task_number,
        )
        return "\n".join(lines)

    except Exception as exc:  # noqa: BLE001
        # Non-fatal — calibration failure must NOT crash the scoring pipeline.
        logger.warning(
            "Failed to fetch calibration samples (skill=%s task=%s): %s — "
            "proceeding without calibration context.",
            skill,
            task_number,
            exc,
        )
        return ""
