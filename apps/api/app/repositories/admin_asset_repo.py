"""Admin asset repository — queries for content_assets and prompt image maps."""
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content_asset import ContentAsset
from app.models.speaking_prompt_image import SpeakingPromptImage
from app.models.material_asset import MaterialAsset
from app.repositories.base import BaseRepository


class AdminAssetRepo(BaseRepository[ContentAsset]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(ContentAsset, session)

    async def list_cms(
        self,
        asset_type: str | None = None,
        status: str = "active",
        limit: int = 50,
        offset: int = 0,
    ) -> list[ContentAsset]:
        q = select(ContentAsset).where(ContentAsset.status == status)
        if asset_type:
            q = q.where(ContentAsset.asset_type == asset_type)
        q = q.order_by(ContentAsset.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_prompt_images(self, prompt_id: UUID) -> list[SpeakingPromptImage]:
        result = await self.session.execute(
            select(SpeakingPromptImage)
            .where(SpeakingPromptImage.speaking_prompt_id == prompt_id)
            .order_by(SpeakingPromptImage.sort_order)
        )
        return list(result.scalars().all())

    async def add_prompt_image(
        self, prompt_id: UUID, asset_id: UUID, image_role: str = "primary", sort_order: int = 0
    ) -> SpeakingPromptImage:
        obj = SpeakingPromptImage(
            speaking_prompt_id=prompt_id,
            asset_id=asset_id,
            image_role=image_role,
            sort_order=sort_order,
        )
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def remove_prompt_image(self, image_id: UUID) -> bool:
        obj = await self.session.get(SpeakingPromptImage, image_id)
        if not obj:
            return False
        await self.session.delete(obj)
        await self.session.flush()
        return True

    async def get_material_assets(self, material_id: UUID) -> list[MaterialAsset]:
        result = await self.session.execute(
            select(MaterialAsset)
            .where(MaterialAsset.material_id == material_id)
            .order_by(MaterialAsset.sort_order)
        )
        return list(result.scalars().all())
