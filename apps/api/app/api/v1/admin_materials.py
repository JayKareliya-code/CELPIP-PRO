"""Admin CMS — learning material management endpoints."""
import uuid
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.deps import get_db
from app.core.security import require_admin
from app.models.user import User
from app.repositories.admin_material_repo import AdminMaterialRepo
import app.services.admin_material_service as svc
import app.services.admin_access_service as access_svc
from app.api.v1._utils import to_dict

router = APIRouter()
Admin = Annotated[User, Depends(require_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]


class MaterialIn(BaseModel):
    slug: str
    title: str
    summary: str | None = None
    material_type: str
    module: str
    skill: str | None = None
    body_markdown: str | None = None
    difficulty: str | None = None
    estimated_read_minutes: int | None = None
    primary_asset_id: uuid.UUID | None = None
    sort_order: int = 0


class TaskLinkIn(BaseModel):
    skill: str
    task_number: int
    sort_order: int = 0


class AccessRuleIn(BaseModel):
    starter_access: bool = True
    pro_access: bool = True
    ultra_access: bool = True
    requires_addon: bool = False
    addon_code: str | None = None


@router.get("/materials")
async def list_materials(
    db: DB, _: Admin,
    status: str | None = None,
    module: str | None = None,
    material_type: str | None = None,
    search: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
) -> list[dict[str, Any]]:
    repo = AdminMaterialRepo(db)
    items = await repo.list_cms(status=status, module=module, material_type=material_type,
                                search=search, limit=limit, offset=offset)
    return [to_dict(row) for row in items]


@router.post("/materials", status_code=201)
async def create_material(body: MaterialIn, db: DB, admin: Admin) -> dict[str, Any]:
    material = await svc.create_material(db, body.model_dump(exclude_none=True), admin.id)
    await db.commit()
    await db.refresh(material)
    return to_dict(material)


@router.get("/materials/{material_id}")
async def get_material(material_id: uuid.UUID, db: DB, _: Admin) -> dict[str, Any]:
    repo = AdminMaterialRepo(db)
    material = await repo.get_by_id(material_id)
    if not material:
        raise HTTPException(404, "Material not found")
    return to_dict(material)


@router.patch("/materials/{material_id}")
async def update_material(
    material_id: uuid.UUID, body: MaterialIn, db: DB, admin: Admin
) -> dict[str, Any]:
    repo = AdminMaterialRepo(db)
    material = await repo.get_by_id(material_id)
    if not material:
        raise HTTPException(404, "Material not found")
    updated = await svc.update_material(db, material, body.model_dump(exclude_none=True), admin.id)
    await db.commit()
    await db.refresh(updated)
    return to_dict(updated)


@router.post("/materials/{material_id}/publish")
async def publish_material(material_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    repo = AdminMaterialRepo(db)
    material = await repo.get_by_id(material_id)
    if not material:
        raise HTTPException(404, "Material not found")
    updated = await svc.publish_material(db, material, admin.id)
    await db.commit()
    return {"status": updated.status}


@router.post("/materials/{material_id}/archive")
async def archive_material(material_id: uuid.UUID, db: DB, admin: Admin) -> dict[str, Any]:
    repo = AdminMaterialRepo(db)
    material = await repo.get_by_id(material_id)
    if not material:
        raise HTTPException(404, "Material not found")
    updated = await svc.archive_material(db, material, admin.id)
    await db.commit()
    return {"status": updated.status}


@router.put("/materials/{material_id}/tasks")
async def set_task_links(
    material_id: uuid.UUID, body: list[TaskLinkIn], db: DB, admin: Admin
) -> dict[str, Any]:
    repo = AdminMaterialRepo(db)
    if not await repo.get_by_id(material_id):
        raise HTTPException(404, "Material not found")
    await svc.set_task_links(db, material_id, [t.model_dump() for t in body], admin.id)
    await db.commit()
    links = await repo.get_task_links(material_id)
    return {"task_links": [to_dict(lnk) for lnk in links]}


@router.put("/materials/{material_id}/access-rule")
async def set_access_rule(
    material_id: uuid.UUID, body: AccessRuleIn, db: DB, admin: Admin
) -> dict[str, Any]:
    rule = await access_svc.upsert_rule(
        db, entity_type="learning_material", entity_id=material_id, **body.model_dump()
    )
    await db.commit()
    return to_dict(rule)
