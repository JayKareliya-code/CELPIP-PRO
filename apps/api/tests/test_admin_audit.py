"""S2-10 — verify every admin mutating endpoint writes to admin_audit_logs.

Hits the routes via the test client (covers route-layer audit calls) and queries
the audit log table directly to confirm a row was written. We exercise the
endpoints that don't touch service layers we already trust (admin_prompts and
admin_materials route through service-layer log_action calls covered elsewhere).
"""
from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_audit_log import AdminAuditLog
from app.models.user import User
from tests.conftest import auth_headers


async def _make_admin(db: AsyncSession, clerk_id: str = "admin_audit_user") -> User:
    user = User(
        clerk_user_id=clerk_id,
        email=f"{clerk_id}@example.com",
        full_name="Audit Admin",
        is_admin=True,
    )
    db.add(user)
    await db.flush()
    return user


async def _audit_count(db: AsyncSession) -> int:
    result = await db.execute(select(AdminAuditLog))
    return len(result.scalars().all())


async def _audit_actions(db: AsyncSession) -> set[str]:
    result = await db.execute(select(AdminAuditLog.action_type))
    return set(result.scalars().all())


@pytest.mark.asyncio
async def test_admin_tag_lifecycle_writes_audit_log(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await _make_admin(db_session, "admin_audit_tags")
    headers = auth_headers("admin_audit_tags")

    create_resp = await client.post(
        "/api/v1/admin/tags",
        json={"name": "audit-tag", "slug": "audit-tag", "tag_type": "topic"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    tag_id = create_resp.json()["id"]

    delete_resp = await client.delete(f"/api/v1/admin/tags/{tag_id}", headers=headers)
    assert delete_resp.status_code == 204

    actions = await _audit_actions(db_session)
    assert "create" in actions
    assert "delete" in actions

    rows = (await db_session.execute(
        select(AdminAuditLog).where(AdminAuditLog.entity_type == "content_tag")
    )).scalars().all()
    assert len(rows) >= 2
    assert all(r.admin_user_id is not None for r in rows)


@pytest.mark.asyncio
async def test_admin_tag_link_writes_audit_log(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await _make_admin(db_session, "admin_audit_links")
    headers = auth_headers("admin_audit_links")

    tag_resp = await client.post(
        "/api/v1/admin/tags",
        json={"name": "link-tag", "slug": "link-tag", "tag_type": "topic"},
        headers=headers,
    )
    assert tag_resp.status_code == 201
    tag_id = tag_resp.json()["id"]

    entity_id = str(uuid.uuid4())
    link_resp = await client.post(
        "/api/v1/admin/tags/link",
        json={"tag_id": tag_id, "entity_type": "speaking_prompt", "entity_id": entity_id},
        headers=headers,
    )
    assert link_resp.status_code == 201
    link_id = link_resp.json()["id"]

    unlink_resp = await client.delete(f"/api/v1/admin/tags/link/{link_id}", headers=headers)
    assert unlink_resp.status_code == 204

    actions = (await db_session.execute(
        select(AdminAuditLog.action_type).where(
            AdminAuditLog.entity_type == "content_tag_link"
        )
    )).scalars().all()
    assert "link" in actions
    assert "unlink" in actions


@pytest.mark.asyncio
async def test_legacy_admin_prompt_endpoints_write_audit_log(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Legacy /admin/prompts/* routes (not the CMS variant) must also audit."""
    await _make_admin(db_session, "admin_audit_legacy")
    headers = auth_headers("admin_audit_legacy")

    create_resp = await client.post(
        "/api/v1/admin/prompts/speaking",
        json={
            "task_number": 1,
            "title": "Audit test prompt",
            "prompt_text": "Describe your favourite hobby.",
            "prep_time_seconds": 30,
            "response_time_seconds": 90,
            "difficulty": "medium",
        },
        headers=headers,
    )
    assert create_resp.status_code == 201
    prompt_id = create_resp.json()["id"]

    delete_resp = await client.delete(
        f"/api/v1/admin/prompts/speaking/{prompt_id}", headers=headers
    )
    assert delete_resp.status_code == 204

    actions = (await db_session.execute(
        select(AdminAuditLog.action_type).where(
            AdminAuditLog.entity_type == "speaking_prompt"
        )
    )).scalars().all()
    assert "create" in actions
    assert "soft_delete" in actions


@pytest.mark.asyncio
async def test_non_admin_cannot_trigger_audit(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """A non-admin user is rejected at the dependency layer; no audit row is written."""
    before = await _audit_count(db_session)
    resp = await client.post(
        "/api/v1/admin/tags",
        json={"name": "x", "slug": "x", "tag_type": "topic"},
        headers=auth_headers("regular_user"),
    )
    assert resp.status_code == 403
    after = await _audit_count(db_session)
    assert after == before
