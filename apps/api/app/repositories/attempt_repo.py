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
            .where(Attempt.status.not_in(["cancelled"]))
        )
        return result.scalar_one()

    async def count_mock_tests_by_user_skill(
        self, user_id: uuid.UUID, skill: str
    ) -> int:
        """Count non-cancelled mock test attempts for quota enforcement.

        Hits the idx_attempts_mock composite index.
        """
        result = await self.session.execute(
            select(func.count(Attempt.id))
            .where(Attempt.user_id     == user_id)
            .where(Attempt.skill       == skill)
            .where(Attempt.is_mock_test == True)  # noqa: E712
            .where(Attempt.status.not_in(["cancelled"]))
        )
        return result.scalar_one()

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
            .where(Attempt.status.not_in(["cancelled"]))
            .group_by(Attempt.task_number)
        )
        return {row[0]: row[1] for row in result.all()}

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
