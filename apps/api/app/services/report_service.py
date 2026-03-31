"""
Report service — fetches a full report for a completed attempt.

Joins across all Phase 2 tables and returns a ReportResponse.
Row-level security: user_id is checked so users can only access their own reports.
"""
from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.feedback_report import FeedbackReport
from app.models.score_report import ScoreReport, ScoreDimension
from app.models.transcript import Transcript
from app.schemas.report import DimensionScore, ReportResponse

logger = logging.getLogger(__name__)

# Human-readable labels for each rubric dimension key
_DIMENSION_LABELS: dict[str, str] = {
    "task_completion":  "Task Completion",
    "coherence":        "Coherence & Cohesion",
    "vocabulary":       "Vocabulary Range",
    "fluency":          "Fluency & Pronunciation",
    "grammar":          "Grammatical Accuracy",
    "task_fulfillment": "Task Fulfillment",
    "organization":     "Organization",
    "tone_register":    "Tone & Register",
}


async def fetch_report(
    db: AsyncSession,
    attempt_id: UUID,
    user_id: UUID,
) -> ReportResponse | None:
    """
    Fetch the full report for a completed attempt.

    Args:
        db:         Async SQLAlchemy session.
        attempt_id: UUID of the attempt.
        user_id:    UUID of the requesting user (enforces row-level isolation).

    Returns:
        ReportResponse if found and owned by user_id, else None.
    """
    # 1 — Load attempt + verify ownership
    attempt = await db.get(Attempt, attempt_id)
    if attempt is None or attempt.user_id != user_id:
        return None
    if attempt.status != "complete":
        return None

    # 2 — Load ScoreReport
    score_report_result = await db.execute(
        select(ScoreReport).where(ScoreReport.attempt_id == attempt_id)
    )
    score_report = score_report_result.scalar_one_or_none()
    if score_report is None:
        logger.warning("No score_report found for complete attempt %s", attempt_id)
        return None

    # 3 — Load ScoreDimensions
    dims_result = await db.execute(
        select(ScoreDimension)
        .where(ScoreDimension.report_id == score_report.id)
        .order_by(ScoreDimension.dimension)
    )
    dimensions = [
        DimensionScore(
            dimension=d.dimension,
            label=_DIMENSION_LABELS.get(d.dimension, d.dimension.replace("_", " ").title()),
            score=d.score,
            max_score=d.max_score,
        )
        for d in dims_result.scalars().all()
    ]

    # 4 — Load FeedbackReport
    feedback_result = await db.execute(
        select(FeedbackReport).where(FeedbackReport.attempt_id == attempt_id)
    )
    feedback = feedback_result.scalar_one_or_none()
    strengths:        list[str] = feedback.strengths if feedback else []
    weaknesses:       list[str] = feedback.weaknesses if feedback else []
    improvement_tips: list[str] = feedback.improvement_tips if feedback else []
    sample_response:  str       = feedback.sample_response if feedback else ""

    # 5 — Load Transcript (speaking only)
    transcript_text: str | None = None
    if attempt.skill == "speaking":
        tx_result = await db.execute(
            select(Transcript).where(Transcript.attempt_id == attempt_id)
        )
        tx = tx_result.scalar_one_or_none()
        if tx:
            transcript_text = tx.text

    # 6 — Load prompt title
    table = "speaking_prompts" if attempt.skill == "speaking" else "writing_prompts"
    title_result = await db.execute(
        text(f"SELECT title FROM {table} WHERE id = :pid"),
        {"pid": attempt.prompt_id},
    )
    row = title_result.mappings().one_or_none()
    task_title = row["title"] if row else f"Task {attempt.task_number}"

    return ReportResponse(
        attempt_id=attempt_id,
        skill=attempt.skill,
        task_title=task_title,
        estimated_band=float(score_report.estimated_band),
        dimensions=dimensions,
        strengths=strengths,
        weaknesses=weaknesses,
        improvement_tips=improvement_tips,
        sample_response=sample_response,
        transcript=transcript_text,
        completed_at=attempt.updated_at,
    )
