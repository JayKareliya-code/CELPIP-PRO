"""
Combined mock exam history — GET /api/v1/history/mock-exams

Fetches speaking and writing mock sessions independently, merges them into a
unified timeline sorted newest-first, then applies pagination.  This approach
is independent of where each skill stores its data and is easy to extend when
new skills are added.
"""
from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.history import MockExamSession, PaginatedMockExamHistory
from .mock_speaking import get_speaking_mock_sessions
from .mock_writing import get_writing_mock_sessions

logger = logging.getLogger(__name__)


async def get_mock_exam_history(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    limit: int = 10,
) -> PaginatedMockExamHistory:
    """Return paginated mock exam sessions for a user, newest-first.

    Aggregates sessions from ALL skills:
      • Speaking — from mock_exam_task_attempts (session_id keyed)
      • Writing  — from attempts (grouped by mock_exam_number)

    New skills can be added by implementing a get_<skill>_mock_sessions()
    function and appending the result to `all_sessions` below.
    """
    offset = (page - 1) * limit

    # ── Gather sessions from each skill ───────────────────────────────────────
    all_sessions: list[MockExamSession] = []

    speaking_sessions = await get_speaking_mock_sessions(db, user_id)
    all_sessions.extend(speaking_sessions)

    writing_sessions = await get_writing_mock_sessions(db, user_id)
    all_sessions.extend(writing_sessions)

    # ── Sort newest-first, paginate ───────────────────────────────────────────
    all_sessions.sort(key=lambda s: s.created_at, reverse=True)

    total      = len(all_sessions)
    page_items = all_sessions[offset: offset + limit]

    logger.debug(
        "Mock exam history: user=%s total=%d page=%d speaking=%d writing=%d",
        user_id, total, page, len(speaking_sessions), len(writing_sessions),
    )

    return PaginatedMockExamHistory(
        items=page_items,
        total=total,
        page=page,
        limit=limit,
        has_next=(offset + limit) < total,
    )
