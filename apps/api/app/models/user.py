import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.tos_acceptance import TosAcceptance


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id:              Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    clerk_user_id:   Mapped[str]       = mapped_column(String, unique=True, index=True, nullable=False)
    email:           Mapped[str]       = mapped_column(String, unique=True, nullable=False)
    full_name:       Mapped[str | None] = mapped_column(Text)
    plan:            Mapped[str]       = mapped_column(String, default="starter", nullable=False)

    is_admin:        Mapped[bool]       = mapped_column(Boolean, default=False, nullable=False)
    streak_days:     Mapped[int]        = mapped_column(Integer, default=0, nullable=False)
    last_active_date: Mapped[date | None] = mapped_column(Date)
    target_band:     Mapped[float | None] = mapped_column(Numeric(3, 1))

    tos_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    tos_version:     Mapped[str | None]      = mapped_column(String(32))

    # Retry-credit pool. Free plan = 0 (cannot retry). Pro plan = granted
    # PRO_RETRY_CREDITS_GRANT once at activation. Add-on purchases top up.
    # Spent on practice redoes (PRACTICE_RETRY_COST each) and mock retakes
    # (SPEAKING_MOCK_RETRY_COST / WRITING_MOCK_RETRY_COST). Authoritative
    # source for quota gate decisions; the retry_credit_ledger table holds
    # the audit trail of every change.
    retry_credits_balance: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, server_default="0"
    )

    __table_args__ = (
        # Loose DB-level shape check; canonical allowlist is enforced at the
        # application layer (Pydantic + `_normalize_plan_slug`). See the
        # matching note on Subscription.plan for why this is intentionally
        # not an IN-list.
        CheckConstraint("plan IS NOT NULL AND length(plan) BETWEEN 1 AND 32",
                        name="check_user_plan"),
        CheckConstraint("retry_credits_balance >= 0", name="check_retry_credits_non_negative"),
    )

    # Audit log of every ToS acceptance event (append-only)
    tos_acceptances: Mapped[list["TosAcceptance"]] = relationship(
        "TosAcceptance",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
