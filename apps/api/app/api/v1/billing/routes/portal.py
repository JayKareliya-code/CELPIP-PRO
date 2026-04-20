# ─────────────────────────────────────────────────────────────────────────────
# billing/routes/portal.py — GET /billing/portal
#
# Creates a Stripe Customer Portal session so the user can view receipts,
# download invoices, and manage their payment methods.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import stripe

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.api.v1.billing.schemas import PortalResponse
from app.api.v1.billing.helpers import get_active_subscription

router = APIRouter()


@router.get("/billing/portal", response_model=PortalResponse)
async def create_portal_session(
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> PortalResponse:
    """
    Create a Stripe Customer Portal session.

    Requires an existing Stripe customer (the user must have completed at
    least one purchase).  The portal URL is short-lived and should be used
    immediately by the frontend.
    """
    sub = await get_active_subscription(user, db)
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(
            status_code=404,
            detail="No billing record found. Complete a purchase first.",
        )

    portal_session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/billing",
    )
    return PortalResponse(portal_url=portal_session["url"])
