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
_MAX_SAMPLE_CHARS = 400   # truncate each sample text at this length


async def build_calibration_context(
    db: AsyncSession,
    skill: str,
    task_number: int | None,
) -> str:
    """
    Fetch active calibration samples and return a formatted block for prompt injection.

    Args:
        db:          Async SQLAlchemy session.
        skill:       "speaking" or "writing".
        task_number: The specific task number (0–8 for speaking, 1–2 for writing).
                     Pass None to retrieve only global (task_number IS NULL) samples.

    Returns:
        A formatted multi-line string, or "" if no samples are found.
    """
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
            "Injecting %d calibration samples for skill=%s task=%s",
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
