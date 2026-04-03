"""Admin CMS — audit log and version history endpoints."""
import uuid
from typing import Annotated, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.api.v1._utils import to_dict
from app.core.security import require_admin
from app.models.user import User
from app.models.admin_audit_log import AdminAuditLog
from app.services.admin_versioning_service import list_versions, get_version

router = APIRouter()
Admin = Annotated[User, Depends(require_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/audit")
async def list_audit_logs(
    db: DB,
    _: Admin,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    action_type: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
) -> list[dict[str, Any]]:
    q = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
    if entity_type:
        q = q.where(AdminAuditLog.entity_type == entity_type)
    if entity_id:
        q = q.where(AdminAuditLog.entity_id == entity_id)
    if action_type:
        q = q.where(AdminAuditLog.action_type == action_type)
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    return [to_dict(log) for log in result.scalars().all()]


@router.get("/versions/{entity_type}/{entity_id}")
async def get_versions(
    entity_type: str, entity_id: uuid.UUID, db: DB, _: Admin
) -> list[dict[str, Any]]:
    versions = await list_versions(db, entity_type, entity_id)
    return [to_dict(v) for v in versions]


@router.get("/versions/{entity_type}/{entity_id}/{version_no}")
async def get_single_version(
    entity_type: str, entity_id: uuid.UUID, version_no: int, db: DB, _: Admin
) -> dict[str, Any]:
    from fastapi import HTTPException
    v = await get_version(db, entity_type, entity_id, version_no)
    if not v:
        raise HTTPException(404, "Version not found")
    return to_dict(v)
