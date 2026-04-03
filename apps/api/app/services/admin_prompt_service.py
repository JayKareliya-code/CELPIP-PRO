"""Admin prompt service — create, edit, publish, archive, clone prompts."""
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin_prompt_repo import AdminSpeakingPromptRepo, AdminWritingPromptRepo
from app.services.admin_versioning_service import save_snapshot
from app.services.admin_audit_service import log_action
from app.models.prompt import SpeakingPrompt, WritingPrompt


def _snap(obj: SpeakingPrompt | WritingPrompt) -> dict:
    return {c.name: str(getattr(obj, c.name)) for c in obj.__table__.columns}


async def create_speaking(
    session: AsyncSession, payload: dict, admin_id: UUID
) -> SpeakingPrompt:
    repo = AdminSpeakingPromptRepo(session)
    prompt = await repo.create(**payload, created_by=admin_id, updated_by=admin_id)
    await save_snapshot(session, entity_type="speaking_prompt", entity_id=prompt.id,
                        version_no=1, snapshot=_snap(prompt), changed_by=admin_id,
                        change_note="created")
    await log_action(session, admin_user_id=admin_id, action_type="create",
                     entity_type="speaking_prompt", entity_id=prompt.id, new_value=_snap(prompt))
    return prompt


async def update_speaking(
    session: AsyncSession, prompt: SpeakingPrompt, payload: dict, admin_id: UUID
) -> SpeakingPrompt:
    repo = AdminSpeakingPromptRepo(session)
    old = _snap(prompt)
    new_version = prompt.version_no + 1
    updated = await repo.update(prompt, **payload, updated_by=admin_id, version_no=new_version)
    await save_snapshot(session, entity_type="speaking_prompt", entity_id=updated.id,
                        version_no=new_version, snapshot=_snap(updated),
                        changed_by=admin_id, change_note="updated")
    await log_action(session, admin_user_id=admin_id, action_type="update",
                     entity_type="speaking_prompt", entity_id=updated.id,
                     old_value=old, new_value=_snap(updated))
    return updated


async def publish_speaking(
    session: AsyncSession, prompt: SpeakingPrompt, admin_id: UUID
) -> SpeakingPrompt:
    repo = AdminSpeakingPromptRepo(session)
    now = datetime.now(tz=timezone.utc)
    updated = await repo.update(prompt, status="published", published_at=now,
                                is_active=True, updated_by=admin_id)
    await log_action(session, admin_user_id=admin_id, action_type="publish",
                     entity_type="speaking_prompt", entity_id=updated.id)
    return updated


async def archive_speaking(
    session: AsyncSession, prompt: SpeakingPrompt, admin_id: UUID
) -> SpeakingPrompt:
    repo = AdminSpeakingPromptRepo(session)
    now = datetime.now(tz=timezone.utc)
    updated = await repo.update(prompt, status="archived", archived_at=now,
                                is_active=False, updated_by=admin_id)
    await log_action(session, admin_user_id=admin_id, action_type="archive",
                     entity_type="speaking_prompt", entity_id=updated.id)
    return updated


async def clone_speaking(
    session: AsyncSession, source: SpeakingPrompt, admin_id: UUID
) -> SpeakingPrompt:
    repo = AdminSpeakingPromptRepo(session)
    data = {c.name: getattr(source, c.name)
            for c in source.__table__.columns
            if c.name not in ("id", "created_at", "updated_at", "slug", "status",
                              "published_at", "archived_at", "version_no")}
    data.update(status="draft", version_no=1,
                slug=f"{source.slug or source.id}-copy-{uuid4().hex[:6]}" if source.slug else None)
    return await create_speaking(session, data, admin_id)


async def create_writing(
    session: AsyncSession, payload: dict, admin_id: UUID
) -> WritingPrompt:
    repo = AdminWritingPromptRepo(session)
    prompt = await repo.create(**payload, created_by=admin_id, updated_by=admin_id)
    await save_snapshot(session, entity_type="writing_prompt", entity_id=prompt.id,
                        version_no=1, snapshot=_snap(prompt), changed_by=admin_id,
                        change_note="created")
    await log_action(session, admin_user_id=admin_id, action_type="create",
                     entity_type="writing_prompt", entity_id=prompt.id, new_value=_snap(prompt))
    return prompt


async def update_writing(
    session: AsyncSession, prompt: WritingPrompt, payload: dict, admin_id: UUID
) -> WritingPrompt:
    repo = AdminWritingPromptRepo(session)
    old = _snap(prompt)
    new_version = prompt.version_no + 1
    updated = await repo.update(prompt, **payload, updated_by=admin_id, version_no=new_version)
    await save_snapshot(session, entity_type="writing_prompt", entity_id=updated.id,
                        version_no=new_version, snapshot=_snap(updated),
                        changed_by=admin_id, change_note="updated")
    await log_action(session, admin_user_id=admin_id, action_type="update",
                     entity_type="writing_prompt", entity_id=updated.id,
                     old_value=old, new_value=_snap(updated))
    return updated


async def publish_writing(
    session: AsyncSession, prompt: WritingPrompt, admin_id: UUID
) -> WritingPrompt:
    repo = AdminWritingPromptRepo(session)
    now = datetime.now(tz=timezone.utc)
    updated = await repo.update(prompt, status="published", published_at=now,
                                is_active=True, updated_by=admin_id)
    await log_action(session, admin_user_id=admin_id, action_type="publish",
                     entity_type="writing_prompt", entity_id=updated.id)
    return updated


async def archive_writing(
    session: AsyncSession, prompt: WritingPrompt, admin_id: UUID
) -> WritingPrompt:
    repo = AdminWritingPromptRepo(session)
    now = datetime.now(tz=timezone.utc)
    updated = await repo.update(prompt, status="archived", archived_at=now,
                                is_active=False, updated_by=admin_id)
    await log_action(session, admin_user_id=admin_id, action_type="archive",
                     entity_type="writing_prompt", entity_id=updated.id)
    return updated
