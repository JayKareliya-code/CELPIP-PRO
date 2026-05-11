"""
MockExamRepository — SQL queries against mock_exam_task_attempts.

Speaking mock exam attempts are stored in this table (NOT the generic
``attempts`` table that WritingAttempt / SpeakingAttempt use).

Two methods are needed for quota enforcement:

  has_session   — redo guard: did this session_id already start uploading?
  count_distinct_sessions — how many unique exam sessions has this user used?

These mirror the role of has_used_mock_slot / count_distinct_mock_slots in
AttemptRepository, but query the correct table for speaking mocks.
"""
import uuid

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mock_exam_attempt import MockExamTaskAttempt


class MockExamRepository:
    """Queries against the mock_exam_task_attempts table."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def has_session(self, user_id: uuid.UUID, session_id: str) -> bool:
        """Return True if this session_id already has at least one upload row.

        Used as the redo guard in enforce_speaking_mock_quota:
        if the user already started this session (even if they abandoned it),
        re-entering is free — quota was already consumed at first upload-url
        request.
        """
        result = await self.session.execute(
            select(func.count(MockExamTaskAttempt.id))
            .where(MockExamTaskAttempt.user_id == user_id)
            .where(MockExamTaskAttempt.session_id == session_id)
        )
        return (result.scalar_one() or 0) > 0

    async def count_distinct_sessions(self, user_id: uuid.UUID) -> int:
        """Count DISTINCT exam sessions this user has ever started.

        All sessions count — including abandoned ones — consistent with the
        "abandon counts toward quota, redo of same session is free" rule.

        Uses a raw COUNT(DISTINCT session_id) for efficiency; the composite
        index idx_mock_exam_user_session covers this query.
        """
        result = await self.session.execute(
            text(
                "SELECT COUNT(DISTINCT session_id) "
                "FROM mock_exam_task_attempts "
                "WHERE user_id = :uid"
            ),
            {"uid": user_id},
        )
        return result.scalar() or 0
