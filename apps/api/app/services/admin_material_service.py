"""Admin material service — CRUD, publish, archive for learning materials."""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin_material_repo import AdminMaterialRepo
from app.services.admin_versioning_service import save_snapshot
from app.services.admin_audit_service import log_action
from app.models.learning_material import LearningMaterial


def _snap(obj: LearningMaterial) -> dict:
    return {c.name: str(getattr(obj, c.name)) for c in obj.__table__.columns}


async def create_material(
    session: AsyncSession, payload: dict, admin_id: UUID
) -> LearningMaterial:
    repo = AdminMaterialRepo(session)
    material = await repo.create(**payload, created_by=admin_id, updated_by=admin_id)
    await save_snapshot(session, entity_type="learning_material", entity_id=material.id,
                        version_no=1, snapshot=_snap(material), changed_by=admin_id,
                        change_note="created")
    await log_action(session, admin_user_id=admin_id, action_type="create",
                     entity_type="learning_material", entity_id=material.id,
                     new_value=_snap(material))
    return material


async def update_material(
    session: AsyncSession, material: LearningMaterial, payload: dict, admin_id: UUID
) -> LearningMaterial:
    repo = AdminMaterialRepo(session)
    old = _snap(material)
    new_version = material.version_no + 1
    updated = await repo.update(material, **payload, updated_by=admin_id, version_no=new_version)
    await save_snapshot(session, entity_type="learning_material", entity_id=updated.id,
                        version_no=new_version, snapshot=_snap(updated),
                        changed_by=admin_id, change_note="updated")
    await log_action(session, admin_user_id=admin_id, action_type="update",
                     entity_type="learning_material", entity_id=updated.id,
                     old_value=old, new_value=_snap(updated))
    return updated


async def publish_material(
    session: AsyncSession, material: LearningMaterial, admin_id: UUID
) -> LearningMaterial:
    repo = AdminMaterialRepo(session)
    now = datetime.now(tz=timezone.utc)
    updated = await repo.update(material, status="published", published_at=now,
                                updated_by=admin_id)
    await log_action(session, admin_user_id=admin_id, action_type="publish",
                     entity_type="learning_material", entity_id=updated.id)
    return updated


async def archive_material(
    session: AsyncSession, material: LearningMaterial, admin_id: UUID
) -> LearningMaterial:
    repo = AdminMaterialRepo(session)
    now = datetime.now(tz=timezone.utc)
    updated = await repo.update(material, status="archived", archived_at=now,
                                updated_by=admin_id)
    await log_action(session, admin_user_id=admin_id, action_type="archive",
                     entity_type="learning_material", entity_id=updated.id)
    return updated


async def set_task_links(
    session: AsyncSession,
    material_id: UUID,
    links: list[dict],
    admin_id: UUID,
) -> None:
    repo = AdminMaterialRepo(session)
    await repo.replace_task_links(material_id, links)
    await log_action(session, admin_user_id=admin_id, action_type="set_task_links",
                     entity_type="learning_material", entity_id=material_id,
                     new_value={"links": links})
