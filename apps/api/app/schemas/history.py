"""
Pydantic schemas for the history API response.

GET /api/v1/history → PaginatedHistory
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
