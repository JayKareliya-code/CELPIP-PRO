"""Addon credit service — query and consume practice credits.

Credit lookup rules
───────────────────
The webhook handler expands module-level packs into per-task rows at purchase time:

    speaking_pack qty=N  → 8 rows  (speaking-task-1 … speaking-task-8)
                                    each with credits_total = N × ADDON_CREDITS_PER_PACK
    writing_pack  qty=N  → 2 rows  (writing-task-1, writing-task-2)
    custom_bundle qty=N  → 1 row   (specific task_key only)

This means a simple exact task_key match handles all three addon types uniformly.
A speaking_pack purchase automatically benefits all 8 speaking tasks because the
webhook creates one row per task — no special-case logic is needed here.
"""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.addon_credit import AddonCredit

logger = logging.getLogger(__name__)


async def get_available_credits(
    user_id:  uuid.UUID,
    task_key: str,
    db:       AsyncSession,
) -> int:
    """Return the total number of unconsumed credits for a user × task_key pair.

    Sums (credits_total - credits_used) across all active rows whose task_key
    matches exactly.  Returns 0 if no credits exist.

    Args:
        user_id:  The user's UUID.
        task_key: Task identifier, e.g. ``"speaking-task-4"``.
        db:       Active async database session.
    """
    result = await db.execute(
        select(AddonCredit).where(
            AddonCredit.user_id  == user_id,
            AddonCredit.task_key == task_key,
            AddonCredit.status   == "active",
        )
    )
    rows = result.scalars().all()
    return sum(max(0, row.credits_total - row.credits_used) for row in rows)


async def get_credits_per_task(
    user_id: uuid.UUID,
    skill:   str,
    db:      AsyncSession,
) -> dict[int, int]:
    """Return available addon credits keyed by task_number for a given skill.

    Used by the ``GET /me/quota`` endpoint to expose per-task addon balances so
    the frontend can compute ``effectiveLimit = planLimit + addonCredits``.

    The task_key column uses the format ``"<skill>-task-<task_number>"`` (e.g.
    ``"speaking-task-4"``).  This function parses the integer task_number from
    the key and sums remaining credits across all matching active rows.

    Args:
        user_id: The user's UUID.
        skill:   ``"speaking"`` or ``"writing"``.
        db:      Active async database session.

    Returns:
        Dict mapping task_number → available credits.  Missing tasks imply 0.
    """
    prefix = f"{skill}-task-"
    result = await db.execute(
        select(AddonCredit).where(
            AddonCredit.user_id == user_id,
            AddonCredit.task_key.like(f"{prefix}%"),
            AddonCredit.status  == "active",
            AddonCredit.addon_type != "mock_bundle",  # exclude pool keys
        )
    )
    rows = result.scalars().all()

    credits: dict[int, int] = {}
    for row in rows:
        try:
            task_num = int(row.task_key[len(prefix):])
        except (ValueError, IndexError):
            logger.warning("Unexpected task_key format: %r — skipped", row.task_key)
            continue
        available = max(0, row.credits_total - row.credits_used)
        credits[task_num] = credits.get(task_num, 0) + available

    return credits


async def consume_credit(
    user_id:  uuid.UUID,
    task_key: str,
    db:       AsyncSession,
) -> bool:
    """Atomically consume one credit for the given user × task_key.

    Picks the OLDEST active row with remaining credits, increments
    ``credits_used`` by 1, and sets ``status='exhausted'`` when the row is
    fully consumed.

    Must be called **inside the attempt creation transaction** (the Postgres
    advisory lock in ``enforce_quota`` already serialises concurrent calls for
    the same user, so no additional locking is needed here).

    Args:
        user_id:  The user's UUID.
        task_key: Task identifier, e.g. ``"speaking-task-4"``.
        db:       Active async database session (already locked by caller).

    Returns:
        ``True`` if a credit was consumed, ``False`` if none were available.
    """
    result = await db.execute(
        select(AddonCredit)
        .where(
            AddonCredit.user_id  == user_id,
            AddonCredit.task_key == task_key,
            AddonCredit.status   == "active",
        )
        .order_by(AddonCredit.created_at.asc())
        .limit(1)
        .with_for_update()  # row-level lock for this specific row
    )
    row = result.scalar_one_or_none()

    if row is None or row.credits_used >= row.credits_total:
        return False

    row.credits_used += 1
    if row.credits_used >= row.credits_total:
        row.status = "exhausted"

    db.add(row)
    logger.info(
        "AddonCredit consumed: user=%s task=%s used=%d/%d row=%s",
        user_id, task_key, row.credits_used, row.credits_total, row.id,
    )
    return True


async def get_addon_credit_summary(
    user_id: uuid.UUID,
    db:      AsyncSession,
) -> dict[str, dict[int, dict[str, int]]]:
    """Return a per-skill, per-task credit summary for the billing inventory card.

    Includes both ``active`` and ``exhausted`` rows so the UI can display
    total-purchased history alongside remaining balance.  ``refunded`` rows
    are excluded — they were reversed and should not count toward total.

    Returns:
        Nested dict:  ``{skill: {task_number: {"available": int, "purchased": int}}}``

        ``available``  = credits_total - credits_used  (clamped to 0)
        ``purchased``  = credits_total  (original grant)

        Rows from the SAME purchase that overlap (e.g. two addon_credit rows for the
        same task_key) are summed independently so the user sees the aggregate.

    Example::

        {
          "speaking": {
            1: {"available": 4, "purchased": 5},
            3: {"available": 0, "purchased": 5},
          },
          "writing": {
            1: {"available": 5, "purchased": 5},
            2: {"available": 2, "purchased": 5},
          },
        }
    """
    result = await db.execute(
        select(AddonCredit).where(
            AddonCredit.user_id == user_id,
            AddonCredit.status.in_(["active", "exhausted"]),
        )
    )
    rows = result.scalars().all()

    # skill → task_num → {"available": int, "purchased": int}
    summary: dict[str, dict[int, dict[str, int]]] = {}
    # mock → skill → {"available": int, "purchased": int}
    mock: dict[str, dict[str, int]] = {}

    for row in rows:
        # ── Mock bundle pool rows ──────────────────────────────────────────────
        # task_key format: "mock-test-speaking-addon" / "mock-test-writing-addon"
        if row.addon_type == "mock_bundle":
            skill = "speaking" if "speaking" in row.task_key else "writing"
            entry = mock.setdefault(skill, {"available": 0, "purchased": 0})
            entry["available"] += max(0, row.credits_total - row.credits_used)
            entry["purchased"] += row.credits_total
            continue

        # ── Practice pack / custom bundle rows ────────────────────────────────
        # task_key format:  "speaking-task-4"  or  "writing-task-1"
        parts = row.task_key.split("-task-")
        if len(parts) != 2:
            logger.warning("get_addon_credit_summary: unexpected task_key %r — skipped", row.task_key)
            continue
        skill = parts[0]  # "speaking" | "writing"
        try:
            task_num = int(parts[1])
        except ValueError:
            logger.warning("get_addon_credit_summary: non-integer task_num in %r — skipped", row.task_key)
            continue

        skill_map = summary.setdefault(skill, {})
        entry     = skill_map.setdefault(task_num, {"available": 0, "purchased": 0})
        entry["available"]  += max(0, row.credits_total - row.credits_used)
        entry["purchased"]  += row.credits_total

    return summary, mock

