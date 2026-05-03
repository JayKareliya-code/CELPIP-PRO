# ─────────────────────────────────────────────────────────────────────────────
# billing/routes/checkout.py — POST /billing/checkout
#
# Creates a Stripe Checkout Session for a one-time plan purchase (pro / ultra).
# Returns a checkout_url to which the frontend redirects the user.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
import stripe

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.models.user import User
from app.api.v1.billing.constants import PLAN_PRICE_IDS
from app.api.v1.billing.schemas import CheckoutRequest, CheckoutResponse
from app.api.v1.billing.helpers import get_or_create_stripe_customer

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/billing/checkout", response_model=CheckoutResponse)
@limiter.limit(settings.RATE_LIMIT_CHECKOUT_PER_MIN)
async def create_checkout_session(
    request: Request,
    response: Response,
    body: CheckoutRequest,
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> CheckoutResponse:
    """
    Create a Stripe Checkout Session for a one-time plan purchase.

    - Accepts ``plan='pro'`` or ``plan='ultra'``.
    - Returns a ``checkout_url`` to which the frontend should redirect the user.
    - Pro → Ultra upgrade is fully supported (charges the ultra price; plan is
      updated on webhook confirmation).
    """
    plan = body.plan.lower()

    if plan not in PLAN_PRICE_IDS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown plan: {plan!r}. Must be 'pro' or 'ultra'.",
        )

    price_id = PLAN_PRICE_IDS[plan]
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Stripe price ID for plan '{plan}' is not configured. "
                "Contact support."
            ),
        )

    if user.plan == plan:
        raise HTTPException(
            status_code=409,
            detail=f"You already have the {plan.capitalize()} plan.",
        )

    customer_id = await get_or_create_stripe_customer(user, db)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="payment",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=(
            f"{settings.FRONTEND_URL}/billing"
            f"?success=true&plan={plan}"
        ),
        cancel_url=f"{settings.FRONTEND_URL}/billing?canceled=true",
        metadata={
            "celpipbro_user_id": str(user.id),
            "plan":              plan,
        },
        invoice_creation={"enabled": True},
        customer_update={"address": "auto"},
        allow_promotion_codes=True,
    )

    logger.info(
        "Checkout session created: user=%s plan=%s session=%s",
        user.id, plan, session["id"],
    )
    return CheckoutResponse(checkout_url=session["url"])
