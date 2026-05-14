from __future__ import annotations

import logging

import stripe

from typing import Annotated
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.models.user import User
from app.api.v1.billing.schemas import PromoValidateRequest, PromoValidateResponse

logger = logging.getLogger(__name__)
router = APIRouter()

_RATE_LIMIT = "10/minute"


@router.post("/billing/promo/validate", response_model=PromoValidateResponse)
@limiter.limit(_RATE_LIMIT)
async def validate_promo_code(
    request: Request,
    response: Response,   # required by slowapi to inject rate-limit headers
    body:    PromoValidateRequest,
    user:    Annotated[User, Depends(get_current_user)],
    db:      Annotated[AsyncSession, Depends(get_db)],
) -> PromoValidateResponse:
    """Validate a promo code for UX preflight — returns percent_off if valid.

    This is a display-only endpoint.  The promo code is re-validated by Stripe
    during the actual checkout session creation; never trust client-reported
    discount values for billing calculations.

    Returns HTTP 200 in all cases — validity is communicated in the response body
    so the frontend can surface a clean inline error without catching exceptions.
    """
    try:
        results = stripe.PromotionCode.list(
            code=body.code.upper().strip(),
            active=True,
            limit=1,
            expand=["data.coupon"],
        )
    except stripe.StripeError:
        logger.warning("Promo validate: Stripe API error for code %r", body.code, exc_info=True)
        return PromoValidateResponse(
            valid=False,
            code=body.code,
            message="Unable to verify promo code. Please try again.",
        )

    if not results.data:
        return PromoValidateResponse(
            valid=False,
            code=body.code,
            message="Invalid or expired promo code.",
        )

    promo  = results.data[0]
    coupon = promo.coupon

    if coupon.percent_off is not None:
        percent_off = int(coupon.percent_off)
    else:
        # amount_off coupons are not currently used; treat as 0% for display.
        # The actual discount will still be applied by Stripe at checkout.
        percent_off = 0
        logger.info("Promo %r uses amount_off coupon — percent_off returned as 0", promo.code)

    logger.info("Promo validated: code=%s percent_off=%s user=%s", promo.code, percent_off, user.id)
    return PromoValidateResponse(
        valid=True,
        code=promo.code,
        percent_off=percent_off,
    )
