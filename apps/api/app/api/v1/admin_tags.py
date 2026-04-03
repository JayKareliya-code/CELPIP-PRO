"""Admin CMS — content tag management endpoints."""
import uuid
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.deps import get_db
from app.api.v1._utils import to_dict
from app.core.security import require_admin
from app.models.user import User
from app.models.content_tag import ContentTag, ContentTagLink

router = APIRouter()
Admin = Annotated[User, Depends(require_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]


class TagIn(BaseModel):
    name: str
    slug: str
    tag_type: str


class TagLinkIn(BaseModel):
    tag_id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID


@router.get("/tags")
async def list_tags(db: DB, _: Admin) -> list[dict[str, Any]]:
    result = await db.execute(select(ContentTag).order_by(ContentTag.name))
    return [to_dict(t) for t in result.scalars().all()]


@router.post("/tags", status_code=201)
async def create_tag(body: TagIn, db: DB, _: Admin) -> dict[str, Any]:
    tag = ContentTag(**body.model_dump())
    db.add(tag)
    await db.flush()
    await db.commit()
    await db.refresh(tag)
    return to_dict(tag)


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(tag_id: uuid.UUID, db: DB, _: Admin) -> None:
    tag = await db.get(ContentTag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag not found")
    await db.delete(tag)
    await db.commit()


@router.get("/tags/{entity_type}/{entity_id}")
async def get_entity_tags(
    entity_type: str, entity_id: uuid.UUID, db: DB, _: Admin
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(ContentTagLink).where(
            ContentTagLink.entity_type == entity_type,
            ContentTagLink.entity_id == entity_id,
        )
    )
    return [to_dict(lnk) for lnk in result.scalars().all()]


@router.post("/tags/link", status_code=201)
async def link_tag(body: TagLinkIn, db: DB, _: Admin) -> dict[str, Any]:
    link = ContentTagLink(**body.model_dump())
    db.add(link)
    await db.flush()
    await db.commit()
    await db.refresh(link)
    return to_dict(link)


@router.delete("/tags/link/{link_id}", status_code=204)
async def unlink_tag(link_id: uuid.UUID, db: DB, _: Admin) -> None:
    link = await db.get(ContentTagLink, link_id)
    if not link:
        raise HTTPException(404, "Tag link not found")
    await db.delete(link)
    await db.commit()
