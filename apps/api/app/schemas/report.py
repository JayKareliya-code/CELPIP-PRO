"""
Pydantic schemas for the report API response.

GET /api/v1/attempts/{attempt_id}/report → ReportResponse
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DimensionScore(BaseModel):
    """Per-rubric-criterion score for a completed attempt."""
    dimension: str    # snake_case key:  "task_completion", "coherence", etc.
    label: str        # Human-readable:  "Task Completion", "Coherence & Cohesion", etc.
    score: int        # 1–12
    max_score: int    # always 12


class ReportResponse(BaseModel):
    """Full feedback report returned to the frontend."""
    attempt_id: UUID
    skill: str                       # "speaking" | "writing"
    task_title: str
    estimated_band: float
    dimensions: list[DimensionScore]
    strengths: list[str]
    weaknesses: list[str]
    improvement_tips: list[str]
    sample_response: str
    transcript: str | None           # speaking only; None for writing
    completed_at: datetime
