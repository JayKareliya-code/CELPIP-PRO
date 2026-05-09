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
from app.api.v1.billing.constants import (
    PLAN_PRICE_IDS,
    ADDON_PRICE_IDS,
    KNOWN_TASK_KEYS,
    MOCK_TEST_NUMBERS,
)
from app.api.v1.billing.schemas import CartCheckoutRequest, CheckoutResponse
from app.api.v1.billing.helpers import get_or_create_stripe_customer

logger = logging.getLogger(__name__)
router = APIRouter()

_VALID_ITEM_TYPES: frozenset[str] = frozenset({
    "plan", "writing_pack", "speaking_pack", "custom_bundle", "mock_bundle"
})


def _encode_cart_metadata(items: list, promo_code: str | None) -> dict[str, str]:
    """Encode cart items into a compact Stripe metadata dict.

    Format: ``items`` = pipe-delimited segments ``type:qty:extra``
    - plan items:          ``plan:1:pro``            (extra = plan slug)
    - custom_bundle items: ``custom_bundle:1:speaking-task-4``  (extra = task_key)
    - module pack items:   ``speaking_pack:2:null``  (extra = literal 'null')

    Total metadata value stays well under Stripe's 500-char limit for realistic carts.
    """
    segments = []
    for item in items:
        if item.type == "plan":
            extra = item.metadata.get("plan_slug") or item.id
        elif item.type == "custom_bundle":
            extra = item.metadata.get("task_key", "null")
        elif item.type == "mock_bundle":
            extra = str(item.metadata.get("mock_test_number", "null"))
        else:
            extra = "null"
        segments.append(f"{item.type}:{item.quantity}:{extra}")

    meta: dict[str, str] = {"items": "|".join(segments)}
    if promo_code:
        meta["promo"] = promo_code
    return meta


@router.post("/billing/checkout", response_model=CheckoutResponse)
@limiter.limit(settings.RATE_LIMIT_CHECKOUT_PER_MIN)
async def create_checkout_session(
    request:  Request,
    response: Response,
    body:     CartCheckoutRequest,
    user:     Annotated[User, Depends(get_current_user)],
    db:       Annotated[AsyncSession, Depends(get_db)],
) -> CheckoutResponse:
    """Create a Stripe Checkout Session from a validated cart payload.

    The server is the sole source of truth for price IDs and quantities.
    The client-supplied ``unitPrice`` is ignored — prices are always resolved
    from server-side constants.

    Validation:
    - Unknown item types → 400
    - Duplicate plan purchase → 409
    - custom_bundle without a valid task_key → 400
    - Empty Stripe price ID (misconfigured env) → 503

    Both starter and pro users may purchase addons.
    """
    line_items: list[dict] = []

    for item in body.items:
        if item.type not in _VALID_ITEM_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown item type: {item.type!r}.",
            )

        if item.type == "plan":
            plan_slug = item.metadata.get("plan_slug") or item.id.replace("-", "_")
            # Normalise common id values like "pro-plan" → "pro"
            if plan_slug not in PLAN_PRICE_IDS:
                plan_slug = item.id  # fallback to raw id
            if plan_slug not in PLAN_PRICE_IDS:
                raise HTTPException(status_code=400, detail=f"Unknown plan: {item.id!r}.")
            if user.plan == plan_slug:
                raise HTTPException(
                    status_code=409,
                    detail=f"You already have the {plan_slug.capitalize()} plan.",
                )
            price_id = PLAN_PRICE_IDS[plan_slug]

        elif item.type == "custom_bundle":
            task_key = item.metadata.get("task_key", "")
            if task_key not in KNOWN_TASK_KEYS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid task_key {task_key!r} for custom_bundle.",
                )
            price_id = ADDON_PRICE_IDS["custom_bundle"]

        elif item.type == "mock_bundle":
            mock_num = item.metadata.get("mock_test_number")
            try:
                mock_num = int(mock_num)
            except (TypeError, ValueError):
                mock_num = None
            if mock_num not in MOCK_TEST_NUMBERS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid mock_test_number {mock_num!r}. Must be 1–5.",
                )
            price_id = ADDON_PRICE_IDS["mock_bundle"]

        else:
            # writing_pack | speaking_pack
            price_id = ADDON_PRICE_IDS[item.type]

        if not price_id:
            raise HTTPException(
                status_code=503,
                detail=f"Price ID for {item.type!r} is not configured. Contact support.",
            )

        line_items.append({"price": price_id, "quantity": item.quantity})

    customer_id = await get_or_create_stripe_customer(user, db)

    # Resolve promo code to a Stripe Promotion Code ID for server-side application.
    discounts: list[dict] | None = None
    if body.promo_code:
        try:
            promos = stripe.PromotionCode.list(code=body.promo_code.upper(), active=True, limit=1)
            if promos.data:
                discounts = [{"promotion_code": promos.data[0].id}]
            else:
                logger.warning("Checkout: promo code %r not found in Stripe", body.promo_code)
        except stripe.StripeError:
            logger.warning("Checkout: promo code lookup failed for %r", body.promo_code, exc_info=True)

    # Determine payment_type for subscription row (set by webhook handler).
    has_plan = any(i.type == "plan" for i in body.items)
    payment_type = "cart" if len(body.items) > 1 or not has_plan else "one_time"

    # Build success URL. Addon-only carts pass addon_only=true so SuccessHandler
    # can show the correct toast and skip the plan-change polling loop.
    if has_plan:
        success_url = f"{settings.FRONTEND_URL}/billing?success=true&plan=pro"
    else:
        success_url = f"{settings.FRONTEND_URL}/billing?success=true&addon_only=true"

    session_kwargs: dict = {
        "customer":         customer_id,
        "mode":             "payment",
        "line_items":       line_items,
        "success_url":      success_url,
        "cancel_url":       f"{settings.FRONTEND_URL}/billing?canceled=true",
        "metadata":         {
            "celpipbro_user_id": str(user.id),
            "payment_type":      payment_type,
            **_encode_cart_metadata(body.items, body.promo_code),
        },
        "invoice_creation": {"enabled": True},
        "customer_update":  {"address": "auto"},
    }

    if discounts:
        session_kwargs["discounts"] = discounts
    else:
        session_kwargs["allow_promotion_codes"] = True

    session = stripe.checkout.Session.create(**session_kwargs)

    logger.info(
        "Checkout session created: user=%s items=%d session=%s",
        user.id, len(body.items), session["id"],
    )
    return CheckoutResponse(checkout_url=session["url"])
