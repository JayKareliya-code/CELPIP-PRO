"""Admin versioning service — snapshot before every significant change."""
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content_version import ContentVersion


async def save_snapshot(
    session: AsyncSession,
    *,
    entity_type: str,
    entity_id: UUID,
    version_no: int,
    snapshot: dict,
    changed_by: UUID | None,
    change_note: str | None = None,
) -> ContentVersion:
    """Persist a version snapshot. Caller is responsible for incrementing version_no."""
    cv = ContentVersion(
        entity_type=entity_type,
        entity_id=entity_id,
        version_no=version_no,
        snapshot_json=snapshot,
        changed_by=changed_by,
        change_note=change_note,
    )
    session.add(cv)
    await session.flush()
    return cv


async def list_versions(
    session: AsyncSession,
    entity_type: str,
    entity_id: UUID,
) -> list[ContentVersion]:
    result = await session.execute(
        select(ContentVersion)
        .where(
            ContentVersion.entity_type == entity_type,
            ContentVersion.entity_id == entity_id,
        )
        .order_by(ContentVersion.version_no.desc())
    )
    return list(result.scalars().all())


async def get_version(
    session: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    version_no: int,
) -> ContentVersion | None:
    result = await session.execute(
        select(ContentVersion).where(
            ContentVersion.entity_type == entity_type,
            ContentVersion.entity_id == entity_id,
            ContentVersion.version_no == version_no,
        )
    )
    return result.scalar_one_or_none()
