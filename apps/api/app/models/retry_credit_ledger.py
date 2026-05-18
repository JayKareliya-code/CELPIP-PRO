"""Retry-credit ledger — append-only audit trail of every balance change.

Why a ledger AND a balance column?
----------------------------------
`users.retry_credits_balance` is the authoritative source for quota gate
decisions — gates read it inside an advisory lock and update it atomically.
The ledger is the historical record: it explains WHY the balance moved and
links each change back to its source (Stripe invoice, redo attempt, refund).

The ledger also doubles as an idempotency guard for mock retakes: before
charging a retake we check whether a ledger row with the same source_ref
already exists, so reloading the page mid-mock doesn't double-charge.

Single source of truth on every write
-------------------------------------
The retry_credit_service is the only writer of both this table and the
balance column. Every grant() and consume() call inserts one row here AND
updates the balance, in the same transaction.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RetryCreditLedger(Base):
    """One row per retry-credit balance change. Append-only — never updated."""

    __tablename__ = "retry_credit_ledger"

    id:         Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    user_id:    Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Signed: positive for grants (Pro activation, add-on purchase, support
    # grant), negative for spends (redoes, mock retakes), negative for refunds.
    delta:      Mapped[int] = mapped_column(Integer, nullable=False)

    # Free-form reason code. Known values (extend freely):
    #   'pro_grant', 'addon_purchase', 'practice_retry', 'speaking_mock_retry',
    #   'writing_mock_retry', 'refund', 'support_grant'.
    reason:     Mapped[str] = mapped_column(String(64), nullable=False)

    # For spends: the attempt that consumed the credit. NULL for grants.
    attempt_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)

    # Source identifier — Stripe invoice/PI id for grants, mock session_id
    # for mock-retake spends (used as idempotency key), NULL otherwise.
    source_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        # delta=0 is meaningless — every row must move the balance.
        CheckConstraint("delta != 0", name="check_retry_ledger_delta_non_zero"),
        # Fast user-scoped queries for the Usage tab and for refund lookups.
        Index("idx_retry_ledger_user_created", "user_id", "created_at"),
        # Idempotency lookup: mock retakes check for an existing spend row
        # against the same session before charging.
        Index("idx_retry_ledger_source_ref", "source_ref"),
    )
