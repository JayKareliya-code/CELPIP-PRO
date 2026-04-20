"""Repository for prompt queries (speaking and writing)."""
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prompt import SpeakingPrompt, WritingPrompt
from app.repositories.base import BaseRepository


class SpeakingPromptRepository(BaseRepository[SpeakingPrompt]):
    """Queries for speaking_prompts table."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(SpeakingPrompt, session)

    async def list_active(self) -> list[SpeakingPrompt]:
        """Return all published+active 'practice' prompts ordered by task number.

        Guards on BOTH is_active and status='published' AND prompt_tag='practice'
        to prevent mock-only prompts leaking into individual task practice sessions.
        """
        result = await self.session.execute(
            select(SpeakingPrompt)
            .where(SpeakingPrompt.is_active == True)   # noqa: E712
            .where(SpeakingPrompt.status == "published")
            .where(SpeakingPrompt.prompt_tag == "practice")
            .order_by(SpeakingPrompt.task_number, SpeakingPrompt.sort_order)
        )
        return list(result.scalars().all())

    async def list_active_mock(self) -> list[SpeakingPrompt]:
        """Return all published+active 'mock' prompts ordered by task number.

        Returns one prompt per task (the lowest sort_order) so the mock exam
        always gets exactly 8 prompts in task order.
        """
        result = await self.session.execute(
            select(SpeakingPrompt)
            .where(SpeakingPrompt.is_active == True)   # noqa: E712
            .where(SpeakingPrompt.status == "published")
            .where(SpeakingPrompt.prompt_tag == "mock")
            .order_by(SpeakingPrompt.task_number, SpeakingPrompt.sort_order)
        )
        return list(result.scalars().all())

    async def list_all_admin(self) -> list[SpeakingPrompt]:
        """Return all prompts including inactive (admin view)."""
        result = await self.session.execute(
            select(SpeakingPrompt).order_by(SpeakingPrompt.task_number)
        )
        return list(result.scalars().all())

    async def get_active_by_task(self, task_number: int) -> SpeakingPrompt | None:
        """Return the highest-sort-order published 'practice' prompt for the given task."""
        result = await self.session.execute(
            select(SpeakingPrompt)
            .where(SpeakingPrompt.is_active == True)   # noqa: E712
            .where(SpeakingPrompt.status == "published")
            .where(SpeakingPrompt.prompt_tag == "practice")
            .where(SpeakingPrompt.task_number == task_number)
            .order_by(SpeakingPrompt.sort_order, SpeakingPrompt.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_active_by_id(self, prompt_id: uuid.UUID) -> SpeakingPrompt | None:
        """Return a prompt by UUID only if it is published, active, and tagged 'practice'.

        Used by the practice-page server fetch — prevents a candidate from
        accessing an archived prompt or a mock-only prompt directly.
        """
        result = await self.session.execute(
            select(SpeakingPrompt)
            .where(SpeakingPrompt.id == prompt_id)
            .where(SpeakingPrompt.is_active == True)   # noqa: E712
            .where(SpeakingPrompt.status == "published")
            .where(SpeakingPrompt.prompt_tag == "practice")
        )
        return result.scalar_one_or_none()

    async def soft_delete(self, prompt: SpeakingPrompt) -> SpeakingPrompt:
        """Mark prompt as inactive rather than hard-deleting."""
        return await self.update(prompt, is_active=False)


class WritingPromptRepository(BaseRepository[WritingPrompt]):
    """Queries for writing_prompts table."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(WritingPrompt, session)

    async def list_active(self) -> list[WritingPrompt]:
        """Return all published+active PRACTICE writing prompts ordered by task/sort_order.

        Guards on is_active, status='published', AND prompt_tag='practice' so
        mock prompts never leak into the individual practice UI.
        Mirrors SpeakingPromptRepository.list_active with the same triple guard.
        """
        result = await self.session.execute(
            select(WritingPrompt)
            .where(WritingPrompt.is_active == True)   # noqa: E712
            .where(WritingPrompt.status == "published")
            .where(WritingPrompt.prompt_tag == "practice")
            .order_by(WritingPrompt.task_number, WritingPrompt.sort_order)
        )
        return list(result.scalars().all())

    async def list_mock_active(self) -> list[WritingPrompt]:
        """Return published+active MOCK writing prompts ordered by task_number.

        Used by GET /writing/mock-prompts to serve the writing mock exam.
        Only prompts tagged 'mock' are returned.
        """
        result = await self.session.execute(
            select(WritingPrompt)
            .where(WritingPrompt.is_active == True)   # noqa: E712
            .where(WritingPrompt.status == "published")
            .where(WritingPrompt.prompt_tag == "mock")
            .order_by(WritingPrompt.task_number, WritingPrompt.sort_order)
        )
        return list(result.scalars().all())

    async def list_all_admin(self) -> list[WritingPrompt]:
        """Return all prompts including inactive/draft (admin view)."""
        result = await self.session.execute(
            select(WritingPrompt).order_by(WritingPrompt.task_number, WritingPrompt.sort_order)
        )
        return list(result.scalars().all())

    async def get_active_by_task(self, task_number: int) -> WritingPrompt | None:
        """Return the lowest-sort-order published+active PRACTICE prompt for a given task."""
        result = await self.session.execute(
            select(WritingPrompt)
            .where(WritingPrompt.is_active == True)   # noqa: E712
            .where(WritingPrompt.status == "published")
            .where(WritingPrompt.prompt_tag == "practice")
            .where(WritingPrompt.task_number == task_number)
            .order_by(WritingPrompt.sort_order, WritingPrompt.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_active_by_id(self, prompt_id: uuid.UUID) -> WritingPrompt | None:
        """Return a prompt by UUID only if it is published and active.

        Used by the practice-page server fetch — prevents candidates from
        accessing an archived or draft prompt via a bookmarked URL.
        """
        result = await self.session.execute(
            select(WritingPrompt)
            .where(WritingPrompt.id == prompt_id)
            .where(WritingPrompt.is_active == True)   # noqa: E712
            .where(WritingPrompt.status == "published")
        )
        return result.scalar_one_or_none()

    async def soft_delete(self, prompt: WritingPrompt) -> WritingPrompt:
        """Mark prompt as inactive rather than hard-deleting."""
        return await self.update(prompt, is_active=False)
