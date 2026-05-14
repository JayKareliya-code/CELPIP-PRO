import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class TosAcceptance(Base):
    """
    Append-only audit log of every Terms-of-Service acceptance event.

    One row is inserted each time a user clicks "I Agree".  Rows are never
    updated or deleted so the table acts as an immutable compliance record
    under Quebec's Law 25 and any future audit requirement.

    The users.tos_accepted_at / tos_version columns remain as the fast
    gate-check fields; this table is the authoritative legal evidence.
    """

    __tablename__ = "tos_acceptances"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # The policy version string accepted (e.g. "2026-05-14")
    tos_version: Mapped[str] = mapped_column(String(32), nullable=False)

    # UTC timestamp recorded server-side — not trusting the client clock
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Network & browser context for legal proof of consent
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(Text)

    # Relationship back to user (optional, for admin queries)
    user = relationship("User", back_populates="tos_acceptances")
