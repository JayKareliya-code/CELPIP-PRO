"""
Pydantic schemas for the report API response.

GET /api/v1/attempts/{attempt_id}/report → ReportResponse
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


# ── Rich feedback item schemas ────────────────────────────────────────────────

class FeedbackItemSchema(BaseModel):
    """A single strength or weakness entry returned to the frontend."""
    label: str          # Dimension name: "Vocabulary Range"
    observation: str    # What was done well / what the gap is
    quote: str          # Verbatim excerpt from the transcript
    fix: str = ""       # Weaknesses only: concrete action to fix it


class ImprovementTipSchema(BaseModel):
    """An actionable coaching tip with a drill and concrete example."""
    title: str      # Short label: "Reduce Filler Words"
    why: str        # Why this hurts the score
    how: str        # The practice drill / technique
    example: str    # A concrete before/after phrase


# ── Dimension score ───────────────────────────────────────────────────────────

class DimensionScore(BaseModel):
    """Per-rubric-criterion score for a completed attempt."""
    dimension: str    # snake_case key:  "task_completion", "coherence", etc.
    label: str        # Human-readable:  "Task Completion", "Coherence & Cohesion", etc.
    score: int        # 1–12
    max_score: int    # always 12
    commentary: str = ""   # One-sentence explanation of the score reason


# ── Full report ───────────────────────────────────────────────────────────────

class ReportResponse(BaseModel):
    """Full feedback report returned to the frontend."""
    attempt_id: UUID
    prompt_id: UUID                        # original prompt used for this attempt
    skill: str                             # "speaking" | "writing"
    task_number: int                       # 1–8 speaking; 1–2 writing; 0 = practice
    task_title: str
    prompt_text: str                       # Primary question/instruction text
    instructions_text: str | None          # Writing: header instruction shown above prompt
    context_image_url: str | None          # Speaking Tasks 3, 4, 8: scene image URL
    # Task 5 — Comparing & Persuading
    choice_options: list[Any] | None       # [{name, image_url?, details:[{label,value}]}]
    curveball_option: Any | None           # {name, image_url?, details:[{label,value}]}
    curveball_instruction_text: str | None
    user_response_text: str | None         # speaking → transcript; writing → essay_text
    estimated_band: float
    dimensions: list[DimensionScore]
    strengths: list[FeedbackItemSchema]
    weaknesses: list[FeedbackItemSchema]
    improvement_tips: list[ImprovementTipSchema]
    sample_response: str
    transcript: str | None                 # speaking only (pro plan)
    next_milestone: str = ""              # One-sentence next-step coaching note
    completed_at: datetime
