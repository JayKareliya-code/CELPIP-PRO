"""
Pydantic schemas for the history API response.

GET /api/v1/history              → PaginatedHistory
GET /api/v1/history/mock-exams  → PaginatedMockExamHistory
GET /api/v1/history/task-scores → TaskScoreHistory
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class HistoryItem(BaseModel):
    """One attempt row in the history list."""
    attempt_id: UUID
    skill: str                    # "speaking" | "writing"
    task_number: int
    task_title: str               # human-readable prompt title
    is_mock_test: bool
    status: str                   # "pending" | "processing" | "complete" | "failed"
    estimated_band: float | None  # None if not yet scored
    created_at: datetime


class PaginatedHistory(BaseModel):
    """Paginated list of attempt history items."""
    items: list[HistoryItem]
    total: int       # total rows matching the filter (before pagination)
    page: int
    limit: int
    has_next: bool


# ── Mock exam history ─────────────────────────────────────────────────────────

class MockExamTaskResult(BaseModel):
    """Per-task band score within one mock exam session."""
    task_number:    int
    status:         str            # pending | processing | complete | failed
    estimated_band: float | None


class MockExamSession(BaseModel):
    """One full mock exam session (all tasks for one skill)."""
    session_id:     str
    skill:          str            # "speaking" | "writing"
    tasks:          list[MockExamTaskResult]
    avg_band:       float | None   # mean of completed task bands; None if none scored
    tasks_complete: int            # how many tasks are status=complete
    tasks_total:    int            # 8 for speaking, 2 for writing
    created_at:     datetime       # timestamp of the earliest task in the session


class PaginatedMockExamHistory(BaseModel):
    """Paginated list of mock exam sessions."""
    items:    list[MockExamSession]
    total:    int     # total sessions
    page:     int
    limit:    int
    has_next: bool


# ── Task score history (for score-progress card) ──────────────────────────────

class TaskScorePoint(BaseModel):
    """One historical band score for a specific skill + task_number."""
    attempt_id:     UUID
    estimated_band: float
    completed_at:   datetime


class TaskScoreHistory(BaseModel):
    """Recent scores for one skill+task combination — used to render a score-trend card."""
    skill:        str
    task_number:  int
    scores:       list[TaskScorePoint]   # ordered oldest → newest, max 10 items
