"""
Report service — fetches a full report for a completed attempt.

Joins across all Phase 2 tables and returns a ReportResponse.
Row-level security: user_id is checked so users can only access their own reports.
"""
from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt, WritingAttempt
from app.models.feedback_report import FeedbackReport
from app.models.prompt import SpeakingPrompt, WritingPrompt
from app.models.score_report import ScoreReport, ScoreDimension
from app.models.transcript import Transcript
from app.schemas.report import (
    DimensionScore,
    FeedbackItemSchema,
    ImprovementTipSchema,
    ReportAccess,
    ReportResponse,
)
from app.api.v1._prompt_helpers import sign_prompt_dict

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
    plan: str = "starter",
) -> ReportResponse | None:
    """
    Fetch the full report for a completed attempt.

    Args:
        db:         Async SQLAlchemy session.
        attempt_id: UUID of the attempt.
        user_id:    UUID of the requesting user (enforces row-level isolation).
        plan:       User's current plan ("starter" | "pro" | "ultra").
                    Starter users receive band score only — rubric dimensions,
                    strengths, weaknesses, improvement tips, sample response,
                    and transcript are stripped before returning.

    Returns:
        ReportResponse if found and owned by user_id, else None.
    """
    # 1 — Load attempt + verify ownership (must precede everything else so we
    # know skill + prompt_id and can refuse cross-tenant access).
    attempt = await db.get(Attempt, attempt_id)
    if attempt is None or attempt.user_id != user_id:
        return None
    if attempt.status != "complete":
        return None

    # 2 — Fire every remaining read in parallel. Each is independent of the
    # others; previously they were issued sequentially for ~6 RTTs of wall
    # latency on every report view. ScoreDimension joins through ScoreReport
    # so it doesn't have to wait for the ScoreReport id to come back first.
    is_speaking = attempt.skill == "speaking"
    is_writing  = not is_speaking

    score_report_co = db.execute(
        select(ScoreReport).where(ScoreReport.attempt_id == attempt_id)
    )
    dims_co = db.execute(
        select(ScoreDimension)
        .join(ScoreReport, ScoreDimension.report_id == ScoreReport.id)
        .where(ScoreReport.attempt_id == attempt_id)
        .order_by(ScoreDimension.dimension)
    )
    feedback_co = db.execute(
        select(FeedbackReport).where(FeedbackReport.attempt_id == attempt_id)
    )
    transcript_co = (
        db.execute(select(Transcript).where(Transcript.attempt_id == attempt_id))
        if is_speaking else None
    )
    speaking_prompt_co = (
        db.execute(select(SpeakingPrompt).where(SpeakingPrompt.id == attempt.prompt_id))
        if is_speaking else None
    )
    writing_prompt_co = (
        db.execute(select(WritingPrompt).where(WritingPrompt.id == attempt.prompt_id))
        if is_writing else None
    )
    writing_attempt_co = (
        db.execute(select(WritingAttempt).where(WritingAttempt.attempt_id == attempt_id))
        if is_writing else None
    )

    coros = [
        score_report_co, dims_co, feedback_co,
        transcript_co, speaking_prompt_co, writing_prompt_co, writing_attempt_co,
    ]
    results = await asyncio.gather(*[c for c in coros if c is not None])
    # Pop results in the same order we appended.
    score_report_result = results.pop(0)
    dims_result         = results.pop(0)
    feedback_result     = results.pop(0)
    tx_result           = results.pop(0) if is_speaking else None
    sp_result           = results.pop(0) if is_speaking else None
    wp_result           = results.pop(0) if is_writing  else None
    wa_result           = results.pop(0) if is_writing  else None

    score_report = score_report_result.scalar_one_or_none()
    if score_report is None:
        logger.warning("No score_report found for complete attempt %s", attempt_id)
        return None

    feedback = feedback_result.scalar_one_or_none()

    # dimension_commentary is populated for new reports; None/empty for legacy ones
    dim_commentary: dict[str, str] = (
        feedback.dimension_commentary or {}
    ) if feedback and feedback.dimension_commentary else {}

    dimensions = [
        DimensionScore(
            dimension=d.dimension,
            label=_DIMENSION_LABELS.get(d.dimension, d.dimension.replace("_", " ").title()),
            score=d.score,
            max_score=d.max_score,
            commentary=dim_commentary.get(d.dimension, ""),
        )
        for d in dims_result.scalars().all()
    ]

    def _to_feedback_items(raw_list: list, with_fix: bool = False) -> list[FeedbackItemSchema]:
        """Convert stored JSONB rows (dicts or legacy strings) to Pydantic schema."""
        items: list[FeedbackItemSchema] = []
        for item in (raw_list or []):
            if isinstance(item, dict):
                items.append(FeedbackItemSchema(
                    label=item.get("label", ""),
                    observation=item.get("observation", ""),
                    quote=item.get("quote", ""),
                    fix=item.get("fix", "") if with_fix else "",
                ))
            elif isinstance(item, str):
                # Legacy plain-string row — degrade gracefully
                items.append(FeedbackItemSchema(label="", observation=item, quote="", fix=""))
        return items

    def _to_tip_items(raw_list: list) -> list[ImprovementTipSchema]:
        """Convert stored JSONB rows (dicts or legacy strings) to Pydantic schema."""
        items: list[ImprovementTipSchema] = []
        for item in (raw_list or []):
            if isinstance(item, dict):
                items.append(ImprovementTipSchema(
                    title=item.get("title", ""),
                    why=item.get("why", ""),
                    how=item.get("how", ""),
                    example=item.get("example", ""),
                ))
            elif isinstance(item, str):
                items.append(ImprovementTipSchema(title=item, why="", how="", example=""))
        return items

    strengths        = _to_feedback_items(feedback.strengths if feedback else [], with_fix=False)
    weaknesses       = _to_feedback_items(feedback.weaknesses if feedback else [], with_fix=True)
    improvement_tips = _to_tip_items(feedback.improvement_tips if feedback else [])
    sample_response  = feedback.sample_response if feedback else ""
    next_milestone   = (feedback.next_milestone or "") if feedback else ""

    # Pull the judge's step-by-step reasoning trace out of raw_rubric_json if
    # present. Schema v1 stored it nested under {"judge": {...}}; schema v2
    # (current) writes it flat at the top level. Check both shapes so reports
    # generated under either schema render correctly.
    scoring_rationale: str = ""
    rubric_blob = score_report.raw_rubric_json or {}
    if isinstance(rubric_blob, dict):
        scoring_rationale = rubric_blob.get("scoring_rationale") or ""
        if not scoring_rationale:
            judge_blob = rubric_blob.get("judge")
            if isinstance(judge_blob, dict):
                scoring_rationale = judge_blob.get("scoring_rationale") or ""

    # 3 — Transcript text (speaking only, pre-fetched above)
    transcript_text: str | None = None
    if tx_result is not None:
        tx = tx_result.scalar_one_or_none()
        if tx:
            transcript_text = tx.text

    # 4 — Prompt fields (pre-fetched above based on skill)
    task_title                 = f"Task {attempt.task_number}"
    prompt_text                = ""
    instructions_text          = None
    context_image_url          = None
    choice_options             = None
    curveball_option           = None
    curveball_instruction_text = None

    if sp_result is not None:
        sp = sp_result.scalar_one_or_none()
        if sp:
            task_title                 = sp.title
            prompt_text                = sp.prompt_text
            instructions_text          = sp.instructions_text
            context_image_url          = sp.context_image_url
            choice_options             = sp.choice_options          # Task 5 only
            curveball_option           = sp.curveball_option        # Task 5 only
            curveball_instruction_text = sp.curveball_instruction_text  # Task 5 only
    elif wp_result is not None:
        wp = wp_result.scalar_one_or_none()
        if wp:
            task_title        = wp.title
            prompt_text       = wp.prompt_text
            instructions_text = wp.instructions_text

    # 7 — Pre-sign any S3 image URLs in the prompt data
    # sign_prompt_dict handles context_image_url, choice_options[*].image_url
    # and curveball_option.image_url — all stored as bare S3 keys in the DB.
    prompt_image_data = sign_prompt_dict({
        "context_image_url": context_image_url,
        "choice_options":    choice_options,
        "curveball_option":  curveball_option,
    })
    context_image_url = prompt_image_data.get("context_image_url")
    choice_options    = prompt_image_data.get("choice_options")
    curveball_option  = prompt_image_data.get("curveball_option")

    # 5 — User response text (transcript for speaking, essay for writing).
    # Speaking: reuse the transcript we already fetched. Writing: pre-fetched
    # WritingAttempt above.
    user_response_text: str | None = None
    if is_speaking:
        if transcript_text:
            user_response_text = transcript_text
    elif wa_result is not None:
        wa = wa_result.scalar_one_or_none()
        if wa:
            user_response_text = wa.essay_text

    # 9 — Determine whether to return Pro-only fields
    is_pro = plan in ("pro", "ultra")
    normalised_plan = plan if plan in ("starter", "pro", "ultra") else "starter"

    # Stable section identifiers for the UI to key off when rendering locked
    # overlays. Mirrored on the frontend in components/report — keep in sync.
    locked_sections: list[str] = [] if is_pro else [
        "dimensions",
        "strengths",
        "weaknesses",
        "improvement_tips",
        "sample_response",
        "transcript",
        "next_milestone",
        "analytics",
    ]

    access = ReportAccess(
        has_full_report=is_pro,
        plan=normalised_plan,  # type: ignore[arg-type]
        locked_sections=locked_sections,
    )

    return ReportResponse(
        attempt_id=attempt_id,
        prompt_id=attempt.prompt_id,
        skill=attempt.skill,
        task_number=attempt.task_number,
        task_title=task_title,
        prompt_text=prompt_text,
        instructions_text=instructions_text,
        context_image_url=context_image_url,
        choice_options=choice_options,
        curveball_option=curveball_option,
        curveball_instruction_text=curveball_instruction_text,
        user_response_text=user_response_text,   # always returned (user's own data)
        estimated_band=int(round(score_report.estimated_band)),
        # Starter plan: empty lists/strings so the frontend renders a locked
        # report. Pro-only coaching content NEVER reaches a starter client.
        dimensions=dimensions             if is_pro else [],
        strengths=strengths               if is_pro else [],
        weaknesses=weaknesses             if is_pro else [],
        improvement_tips=improvement_tips if is_pro else [],
        sample_response=sample_response   if is_pro else "",
        transcript=transcript_text        if is_pro else None,
        next_milestone=next_milestone      if is_pro else "",
        scoring_rationale=scoring_rationale if is_pro else "",
        completed_at=attempt.updated_at,
        access=access,
    )
