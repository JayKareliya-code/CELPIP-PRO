"""Admin audit service — append-only log for every admin mutation."""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_audit_log import AdminAuditLog


async def log_action(
    session: AsyncSession,
    *,
    admin_user_id: UUID | None,
    action_type: str,
    entity_type: str,
    entity_id: UUID | None = None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    metadata: dict | None = None,
) -> AdminAuditLog:
    """Append an audit record. Flush but do not commit — caller owns the transaction."""
    entry = AdminAuditLog(
        admin_user_id=admin_user_id,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value_json=old_value,
        new_value_json=new_value,
        metadata_json=metadata,
    )
    session.add(entry)
    await session.flush()
    return entry
