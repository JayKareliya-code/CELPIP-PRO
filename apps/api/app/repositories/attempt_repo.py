import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.attempt import Attempt
from app.repositories.base import BaseRepository


class AttemptRepository(BaseRepository[Attempt]):
    """All SQL queries related to attempts, quota, and history."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Attempt, session)

    async def count_by_user_skill_task(
        self, user_id: uuid.UUID, skill: str, task_number: int
    ) -> int:
        """Count non-cancelled practice attempts for quota enforcement.

        Hits the idx_attempts_quota composite index.
        """
        result = await self.session.execute(
            select(func.count(Attempt.id))
            .where(Attempt.user_id     == user_id)
            .where(Attempt.skill       == skill)
            .where(Attempt.task_number == task_number)
            .where(Attempt.is_mock_test == False)  # noqa: E712 – SQLAlchemy requires ==
            .where(Attempt.status.not_in(["cancelled", "failed"]))
        )
        return result.scalar_one()

    async def count_distinct_mock_slots(
        self, user_id: uuid.UUID, skill: str
    ) -> int:
        """Count DISTINCT mock_exam_number slots consumed for quota enforcement.

        Re-doing the same slot (mock_exam_number) never increments this count.
        Falls back to raw attempt count for rows without mock_exam_number (legacy).
        """
        result = await self.session.execute(
            select(func.count(func.distinct(Attempt.mock_exam_number)))
            .where(Attempt.user_id      == user_id)
            .where(Attempt.skill        == skill)
            .where(Attempt.is_mock_test == True)   # noqa: E712
            .where(Attempt.status.not_in(["cancelled", "failed"]))
            .where(Attempt.mock_exam_number.is_not(None))
        )
        return result.scalar_one() or 0

    async def has_used_mock_slot(
        self, user_id: uuid.UUID, skill: str, mock_exam_number: int
    ) -> bool:
        """Return True if the user has ANY non-cancelled attempt for this slot.

        Used by enforce_quota to allow unlimited re-dos without burning quota.
        """
        result = await self.session.execute(
            select(func.count(Attempt.id))
            .where(Attempt.user_id        == user_id)
            .where(Attempt.skill          == skill)
            .where(Attempt.is_mock_test   == True)   # noqa: E712
            .where(Attempt.mock_exam_number == mock_exam_number)
            .where(Attempt.status.not_in(["cancelled", "failed"]))
        )
        return (result.scalar_one() or 0) > 0

    # Keep old name as a thin alias so the quota endpoint still compiles while
    # we migrate callers over to count_distinct_mock_slots.
    async def count_mock_tests_by_user_skill(
        self, user_id: uuid.UUID, skill: str
    ) -> int:
        return await self.count_distinct_mock_slots(user_id, skill)

    async def count_per_task(
        self, user_id: uuid.UUID, skill: str
    ) -> dict[int, int]:
        """Return {task_number: count} for all non-cancelled practice attempts.

        Single GROUP BY query; replaces N sequential count queries.
        """
        result = await self.session.execute(
            select(Attempt.task_number, func.count(Attempt.id))
            .where(Attempt.user_id     == user_id)
            .where(Attempt.skill       == skill)
            .where(Attempt.is_mock_test == False)  # noqa: E712
            .where(Attempt.status.not_in(["cancelled", "failed"]))
            .group_by(Attempt.task_number)
        )
        return {row[0]: row[1] for row in result.all()}

    async def get_attempted_prompt_ids(
        self, user_id: uuid.UUID, task_number: int, skill: str = "speaking"
    ) -> set[str]:
        """Return the set of prompt UUIDs the user has already attempted for a task.

        Used by the /speaking/[task] page to mark prompts as attempted so the
        UI can show a green 'Redo' CTA instead of 'Start Practice'.
        """
        result = await self.session.execute(
            select(Attempt.prompt_id)
            .where(Attempt.user_id     == user_id)
            .where(Attempt.skill       == skill)
            .where(Attempt.task_number == task_number)
            .where(Attempt.is_mock_test == False)  # noqa: E712
            .where(Attempt.status.not_in(["cancelled", "failed"]))
            .distinct()
        )
        return {str(row[0]) for row in result.all()}


    async def get_status(
        self, attempt_id: uuid.UUID, user_id: uuid.UUID
    ) -> Attempt | None:
        """Single indexed read — safe for 3-second polling cadence."""
        result = await self.session.execute(
            select(Attempt)
            .where(Attempt.id      == attempt_id)
            .where(Attempt.user_id == user_id)  # row-level isolation
        )
        return result.scalar_one_or_none()

    async def paginated_history(
        self, user_id: uuid.UUID, skill: str | None, page: int, per_page: int
    ) -> tuple[list[Attempt], int]:
        """Return a page of attempts and total count for history view."""
        q = select(Attempt).where(Attempt.user_id == user_id)
        if skill:
            q = q.where(Attempt.skill == skill)
        count_result = await self.session.execute(
            select(func.count()).select_from(q.subquery())
        )
        total = count_result.scalar_one()
        result = await self.session.execute(
            q.order_by(Attempt.created_at.desc())
             .offset((page - 1) * per_page)
             .limit(per_page)
        )
        return list(result.scalars().all()), total
