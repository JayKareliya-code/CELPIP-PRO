"""Admin access service — read/write content_access_rules."""
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content_access_rule import ContentAccessRule


async def get_rule(
    session: AsyncSession, entity_type: str, entity_id: UUID
) -> ContentAccessRule | None:
    result = await session.execute(
        select(ContentAccessRule).where(
            ContentAccessRule.entity_type == entity_type,
            ContentAccessRule.entity_id == entity_id,
        )
    )
    return result.scalar_one_or_none()


async def upsert_rule(
    session: AsyncSession,
    *,
    entity_type: str,
    entity_id: UUID,
    starter_access: bool = True,
    pro_access: bool = True,
    ultra_access: bool = True,
    requires_addon: bool = False,
    addon_code: str | None = None,
) -> ContentAccessRule:
    rule = await get_rule(session, entity_type, entity_id)
    if rule:
        rule.starter_access = starter_access
        rule.pro_access = pro_access
        rule.ultra_access = ultra_access
        rule.requires_addon = requires_addon
        rule.addon_code = addon_code
        session.add(rule)
    else:
        rule = ContentAccessRule(
            entity_type=entity_type,
            entity_id=entity_id,
            starter_access=starter_access,
            pro_access=pro_access,
            ultra_access=ultra_access,
            requires_addon=requires_addon,
            addon_code=addon_code,
        )
        session.add(rule)
    await session.flush()
    return rule


async def can_access(
    session: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    plan: str,
    addon_codes: list[str] | None = None,
) -> bool:
    """Return True if the given plan + add-ons can access this content item."""
    rule = await get_rule(session, entity_type, entity_id)
    if not rule:
        return True  # no rule = open access

    plan_ok = {
        "starter": rule.starter_access,
        "pro": rule.pro_access,
        "ultra": rule.ultra_access,
    }.get(plan, False)

    if rule.requires_addon:
        addon_ok = bool(addon_codes and rule.addon_code in addon_codes)
        return addon_ok or plan_ok

    return plan_ok
