"""Admin prompt repository — extended queries for CMS prompt management."""
from uuid import UUID
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prompt import SpeakingPrompt, WritingPrompt
from app.repositories.base import BaseRepository


class AdminSpeakingPromptRepo(BaseRepository[SpeakingPrompt]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(SpeakingPrompt, session)

    async def list_cms(
        self,
        status: str | None = None,
        search: str | None = None,
        task_number: int | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> list[SpeakingPrompt]:
        q = select(SpeakingPrompt)
        if status:
            q = q.where(SpeakingPrompt.status == status)
        if task_number is not None:
            q = q.where(SpeakingPrompt.task_number == task_number)
        if search:
            pattern = f"%{search}%"
            q = q.where(or_(
                SpeakingPrompt.title.ilike(pattern),
                SpeakingPrompt.slug.ilike(pattern),
            ))
        q = q.order_by(SpeakingPrompt.sort_order, SpeakingPrompt.task_number)
        q = q.limit(limit).offset(offset)
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_by_slug(self, slug: str) -> SpeakingPrompt | None:
        result = await self.session.execute(
            select(SpeakingPrompt).where(SpeakingPrompt.slug == slug)
        )
        return result.scalar_one_or_none()

    async def soft_delete(self, prompt: SpeakingPrompt) -> None:
        await self.update(prompt, is_active=False)


class AdminWritingPromptRepo(BaseRepository[WritingPrompt]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(WritingPrompt, session)

    async def list_cms(
        self,
        status: str | None = None,
        search: str | None = None,
        task_number: int | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> list[WritingPrompt]:
        q = select(WritingPrompt)
        if status:
            q = q.where(WritingPrompt.status == status)
        if task_number is not None:
            q = q.where(WritingPrompt.task_number == task_number)
        if search:
            pattern = f"%{search}%"
            q = q.where(or_(
                WritingPrompt.title.ilike(pattern),
                WritingPrompt.slug.ilike(pattern),
            ))
        q = q.order_by(WritingPrompt.sort_order, WritingPrompt.task_number)
        q = q.limit(limit).offset(offset)
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_by_slug(self, slug: str) -> WritingPrompt | None:
        result = await self.session.execute(
            select(WritingPrompt).where(WritingPrompt.slug == slug)
        )
        return result.scalar_one_or_none()

    async def soft_delete(self, prompt: WritingPrompt) -> None:
        await self.update(prompt, is_active=False)
