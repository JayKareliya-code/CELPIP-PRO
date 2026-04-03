"""Admin material repository — CRUD queries for learning materials."""
from uuid import UUID
from sqlalchemy import select, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.learning_material import LearningMaterial
from app.models.learning_material_task_link import LearningMaterialTaskLink
from app.repositories.base import BaseRepository


class AdminMaterialRepo(BaseRepository[LearningMaterial]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(LearningMaterial, session)

    async def list_cms(
        self,
        status: str | None = None,
        module: str | None = None,
        material_type: str | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[LearningMaterial]:
        q = select(LearningMaterial)
        if status:
            q = q.where(LearningMaterial.status == status)
        if module:
            q = q.where(LearningMaterial.module == module)
        if material_type:
            q = q.where(LearningMaterial.material_type == material_type)
        if search:
            pattern = f"%{search}%"
            q = q.where(or_(
                LearningMaterial.title.ilike(pattern),
                LearningMaterial.slug.ilike(pattern),
            ))
        q = q.order_by(LearningMaterial.sort_order, LearningMaterial.title)
        q = q.limit(limit).offset(offset)
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_by_slug(self, slug: str) -> LearningMaterial | None:
        result = await self.session.execute(
            select(LearningMaterial).where(LearningMaterial.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_task_links(self, material_id: UUID) -> list[LearningMaterialTaskLink]:
        result = await self.session.execute(
            select(LearningMaterialTaskLink)
            .where(LearningMaterialTaskLink.material_id == material_id)
            .order_by(LearningMaterialTaskLink.skill, LearningMaterialTaskLink.task_number)
        )
        return list(result.scalars().all())

    async def replace_task_links(
        self,
        material_id: UUID,
        links: list[dict],
    ) -> list[LearningMaterialTaskLink]:
        await self.session.execute(
            delete(LearningMaterialTaskLink).where(
                LearningMaterialTaskLink.material_id == material_id
            )
        )
        created = []
        for link in links:
            obj = LearningMaterialTaskLink(material_id=material_id, **link)
            self.session.add(obj)
            created.append(obj)
        await self.session.flush()
        return created
