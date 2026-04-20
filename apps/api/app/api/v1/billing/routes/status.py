# ─────────────────────────────────────────────────────────────────────────────
# billing/routes/status.py — GET /billing/status
#
# Returns the current billing state for the authenticated user:
#   - Active plan slug (starter | pro | ultra)
#   - Stripe customer ID (if they've ever purchased)
#   - Whether they have an active purchase on record
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.api.v1.billing.schemas import BillingStatusResponse
from app.api.v1.billing.helpers import get_active_subscription

router = APIRouter()


@router.get("/billing/status", response_model=BillingStatusResponse)
async def get_billing_status(
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> BillingStatusResponse:
    """Return the current billing status for the authenticated user."""
    sub = await get_active_subscription(user, db)
    return BillingStatusResponse(
        plan=user.plan,
        stripe_customer_id=sub.stripe_customer_id if sub else None,
        has_active_purchase=sub is not None,
    )
