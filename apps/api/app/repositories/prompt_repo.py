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
        """Return all published+active speaking prompts ordered by task number.

        Guards on BOTH is_active and status='published' to prevent draft or
        archived prompts leaking when an admin sets is_active=True prematurely.
        """
        result = await self.session.execute(
            select(SpeakingPrompt)
            .where(SpeakingPrompt.is_active == True)   # noqa: E712
            .where(SpeakingPrompt.status == "published")
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
        """Return the highest-sort-order published prompt for the given task number."""
        result = await self.session.execute(
            select(SpeakingPrompt)
            .where(SpeakingPrompt.is_active == True)   # noqa: E712
            .where(SpeakingPrompt.status == "published")
            .where(SpeakingPrompt.task_number == task_number)
            .order_by(SpeakingPrompt.sort_order, SpeakingPrompt.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_active_by_id(self, prompt_id: uuid.UUID) -> SpeakingPrompt | None:
        """Return a prompt by UUID only if it is published and active.

        Used by the practice-page server fetch — prevents a candidate from
        accessing a prompt after it has been archived by an admin.
        """
        result = await self.session.execute(
            select(SpeakingPrompt)
            .where(SpeakingPrompt.id == prompt_id)
            .where(SpeakingPrompt.is_active == True)   # noqa: E712
            .where(SpeakingPrompt.status == "published")
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
        """Return all active writing prompts ordered by task number."""
        result = await self.session.execute(
            select(WritingPrompt)
            .where(WritingPrompt.is_active == True)  # noqa: E712
            .order_by(WritingPrompt.task_number)
        )
        return list(result.scalars().all())

    async def list_all_admin(self) -> list[WritingPrompt]:
        """Return all prompts including inactive (admin view)."""
        result = await self.session.execute(
            select(WritingPrompt).order_by(WritingPrompt.task_number)
        )
        return list(result.scalars().all())

    async def get_active_by_task(self, task_number: int) -> WritingPrompt | None:
        """Return active prompt for the given task number."""
        result = await self.session.execute(
            select(WritingPrompt)
            .where(WritingPrompt.is_active == True)  # noqa: E712
            .where(WritingPrompt.task_number == task_number)
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def soft_delete(self, prompt: WritingPrompt) -> WritingPrompt:
        """Mark prompt as inactive rather than hard-deleting."""
        return await self.update(prompt, is_active=False)
