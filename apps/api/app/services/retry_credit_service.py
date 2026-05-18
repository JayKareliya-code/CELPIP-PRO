"""Retry-credit service — the only writer of users.retry_credits_balance.

All grant / consume / refund operations:
  1. Acquire the user-scoped Postgres advisory lock (shared with the quota
     gate, so concurrent requests serialise).
  2. Mutate users.retry_credits_balance atomically.
  3. Insert one retry_credit_ledger row describing the change.

Callers MUST be inside an open transaction. The caller's commit/rollback
boundary controls whether the change persists.

Idempotency
-----------
`grant(...)` short-circuits when a ledger row with the same `(reason,
source_ref)` already exists. This makes Stripe webhook retries safe: the same
invoice cannot grant credits twice.

`consume(...)` exposes an idempotency parameter so mock-retake calls can pass
the session_id as `source_ref` and avoid double-charging when the user
reloads mid-mock.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.retry_credit_ledger import RetryCreditLedger
from app.models.user import User

logger = logging.getLogger(__name__)


# ── Result types ─────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class ConsumeResult:
    """Outcome of a consume() call."""
    new_balance: int
    charged:     bool        # False when idempotent short-circuit fired
    cost:        int


# ── Locking helper ───────────────────────────────────────────────────────────

async def _acquire_user_lock(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Acquire the same advisory lock used by app.core.quota.

    Identical key so the credit gate and the plan-quota gate serialise against
    each other — never two writers updating the balance at the same instant.
    """
    try:
        await db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:uid, 0))"),
            {"uid": str(user_id)},
        )
    except Exception:
        # Advisory locks are Postgres-only; tests on SQLite skip silently.
        pass


# ── Read ─────────────────────────────────────────────────────────────────────

async def get_balance(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Return the user's current retry-credit balance (no lock — read-only)."""
    row = await db.execute(
        select(User.retry_credits_balance).where(User.id == user_id)
    )
    balance = row.scalar_one_or_none()
    return int(balance or 0)


async def get_lifetime_granted(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Sum of every positive ledger entry — the user's lifetime total grants.

    Used to render "remaining / total" progress bars. Refund entries (negative
    deltas on the grant side) are NOT subtracted from this total so the user
    sees the original grant value rather than a mid-refund inconsistency.
    """
    from sqlalchemy import func
    row = await db.execute(
        select(func.coalesce(func.sum(RetryCreditLedger.delta), 0))
        .where(RetryCreditLedger.user_id == user_id)
        .where(RetryCreditLedger.delta > 0)
    )
    return int(row.scalar_one() or 0)


# ── Grant / consume / refund ─────────────────────────────────────────────────

async def grant(
    db:         AsyncSession,
    user_id:    uuid.UUID,
    amount:     int,
    reason:     str,
    source_ref: str | None = None,
) -> int:
    """Add `amount` credits to the user's pool. Returns the new balance.

    Idempotent on `(reason, source_ref)` when source_ref is provided — a
    second call with the same source_ref is a no-op. Use this for Stripe
    webhooks where retries are inevitable.

    Pass `amount < 0` to retract credits (e.g. on refund).
    """
    if amount == 0:
        return await get_balance(db, user_id)

    await _acquire_user_lock(db, user_id)

    # Idempotency guard — skip if we've already booked this exact grant.
    if source_ref:
        existing = await db.execute(
            select(RetryCreditLedger.id)
            .where(RetryCreditLedger.user_id == user_id)
            .where(RetryCreditLedger.reason == reason)
            .where(RetryCreditLedger.source_ref == source_ref)
            .limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            logger.info(
                "retry_credit grant idempotent skip: user=%s reason=%s source=%s",
                user_id, reason, source_ref,
            )
            return await get_balance(db, user_id)

    # Clamp downward retractions so balance never goes negative.
    if amount < 0:
        current = await get_balance(db, user_id)
        if current + amount < 0:
            logger.info(
                "retry_credit grant clamped: user=%s requested=%d current=%d "
                "(would go negative; clamping to zero-out current balance)",
                user_id, amount, current,
            )
            amount = -current
            if amount == 0:
                return 0

    # Atomic balance bump.
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(retry_credits_balance=User.retry_credits_balance + amount)
    )

    db.add(RetryCreditLedger(
        user_id=user_id,
        delta=amount,
        reason=reason,
        source_ref=source_ref,
    ))
    await db.flush()

    new_balance = await get_balance(db, user_id)
    logger.info(
        "retry_credit grant: user=%s delta=%+d reason=%s source=%s new_balance=%d",
        user_id, amount, reason, source_ref, new_balance,
    )
    return new_balance


async def consume(
    db:                     AsyncSession,
    user_id:                uuid.UUID,
    cost:                   int,
    reason:                 str,
    attempt_id:             uuid.UUID | None = None,
    source_ref:             str | None       = None,
    idempotent_source_ref:  bool             = False,
) -> ConsumeResult:
    """Deduct `cost` credits. Raises 402 if the pool is insufficient.

    Pass `idempotent_source_ref=True` together with `source_ref` to make the
    consume a no-op when a spend row with the same `(reason, source_ref)`
    already exists (mock-retake flow: the same session_id should not be
    charged twice if the user reloads mid-exam).
    """
    if cost <= 0:
        raise ValueError(f"consume cost must be positive, got {cost!r}")

    await _acquire_user_lock(db, user_id)

    # Idempotency for mock retakes — same session_id, don't double-charge.
    if idempotent_source_ref and source_ref:
        existing = await db.execute(
            select(RetryCreditLedger.id)
            .where(RetryCreditLedger.user_id == user_id)
            .where(RetryCreditLedger.reason == reason)
            .where(RetryCreditLedger.source_ref == source_ref)
            .where(RetryCreditLedger.delta < 0)
            .limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            balance = await get_balance(db, user_id)
            logger.info(
                "retry_credit consume idempotent skip: user=%s reason=%s source=%s",
                user_id, reason, source_ref,
            )
            return ConsumeResult(new_balance=balance, charged=False, cost=cost)

    balance = await get_balance(db, user_id)
    if balance < cost:
        logger.info(
            "retry_credit consume rejected: user=%s cost=%d balance=%d reason=%s",
            user_id, cost, balance, reason,
        )
        raise HTTPException(
            status_code=402,
            detail={
                "code":        "RETRY_CREDITS_EXHAUSTED",
                "required":    cost,
                "remaining":   balance,
                "message": (
                    "You're out of retry credits. Upgrade or purchase a pack to "
                    "continue retrying tasks."
                ),
                "upgrade_url": "/billing",
            },
        )

    # Atomic deduction.
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(retry_credits_balance=User.retry_credits_balance - cost)
    )

    db.add(RetryCreditLedger(
        user_id=user_id,
        delta=-cost,
        reason=reason,
        attempt_id=attempt_id,
        source_ref=source_ref,
    ))
    await db.flush()

    new_balance = balance - cost
    logger.info(
        "retry_credit consumed: user=%s cost=%d reason=%s attempt=%s new_balance=%d",
        user_id, cost, reason, attempt_id, new_balance,
    )
    return ConsumeResult(new_balance=new_balance, charged=True, cost=cost)


async def refund_by_source(
    db:         AsyncSession,
    user_id:    uuid.UUID,
    source_ref: str,
    reason:     str = "refund",
) -> int:
    """Reverse every grant tied to `source_ref` (a Stripe PI id).

    Sums all positive ledger entries with the matching source_ref and books
    a single negative entry. Clamps to current balance — never goes negative
    (the spent portion is the user's to keep).
    """
    rows = await db.execute(
        select(RetryCreditLedger.delta)
        .where(RetryCreditLedger.user_id == user_id)
        .where(RetryCreditLedger.source_ref == source_ref)
        .where(RetryCreditLedger.delta > 0)
    )
    total_granted = sum(int(d) for (d,) in rows.all())
    if total_granted <= 0:
        logger.info(
            "retry_credit refund_by_source: no grants found user=%s source=%s",
            user_id, source_ref,
        )
        return await get_balance(db, user_id)

    # grant() clamps the negative amount against the current balance.
    # source_ref is intentionally a different sentinel so the idempotency
    # check in grant() doesn't mistake the refund for the original grant.
    return await grant(
        db,
        user_id,
        -total_granted,
        reason=reason,
        source_ref=f"refund:{source_ref}",
    )
