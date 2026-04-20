# ─────────────────────────────────────────────────────────────────────────────
# billing/routes/webhook.py — POST /billing/webhook
#
# Receives Stripe webhook events, verifies the signature, and dispatches to
# the appropriate event handler.
#
# Supported events:
#   checkout.session.completed  → upgrade user plan, upsert Subscription row,
#                                  publish Redis event for SSE live push
#
# Error handling policy:
#   Always return HTTP 200 to Stripe.  Internal failures are logged for
#   manual investigation.  Stripe retries are therefore suppressed — a
#   deliberate trade-off to avoid duplicate charges or plan downgrades.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import json
import logging
import uuid

import stripe
import redis.asyncio as aioredis

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db, get_redis_pool
from app.models.user import User
from app.models.subscription import Subscription
from app.api.v1.billing.constants import PLAN_CHANNEL_PREFIX

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Route ─────────────────────────────────────────────────────────────────────


@router.post("/billing/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    """
    Stripe webhook receiver.

    Verifies the ``Stripe-Signature`` header when ``STRIPE_WEBHOOK_SECRET`` is
    configured (required in production).  In local development without the
    secret the check is skipped with a warning.
    """
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    secret     = settings.STRIPE_WEBHOOK_SECRET

    if secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, secret)
        except Exception as exc:
            logger.warning("Stripe webhook signature verification failed: %s", exc)
            raise HTTPException(status_code=400, detail="Invalid Stripe signature.")
    else:
        logger.warning(
            "STRIPE_WEBHOOK_SECRET is not set — skipping signature verification. "
            "This is ONLY acceptable in local development."
        )
        event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)

    event_type = event["type"]
    logger.debug("Stripe webhook received: %s", event_type)

    if event_type == "checkout.session.completed":
        redis_client = get_redis_pool()
        await _handle_checkout_completed(
            session_obj=event["data"]["object"],
            db=db,
            redis_client=redis_client,
        )

    # Always 200 — Stripe must not retry based on our internal errors.
    return JSONResponse({"status": "ok"})


# ── Event handler ─────────────────────────────────────────────────────────────


async def _handle_checkout_completed(
    session_obj,
    db: AsyncSession,
    redis_client: aioredis.Redis,
) -> None:
    """
    Process a ``checkout.session.completed`` event.

    Steps
    -----
    1. Parse ``metadata`` (user_id, plan), ``customer``, ``payment_intent``.
    2. Validate the user UUID and fetch the User row.
    3. Upgrade ``user.plan`` to the purchased plan.
    4. Upsert the ``subscriptions`` row with the Stripe IDs.
    5. Commit the transaction → plan is live in the DB immediately.
    6. Publish a Redis message → SSE stream pushes the change to the browser.
    """
    try:
        # ── 1. Parse Stripe session fields ─────────────────────────────────────
        try:
            metadata_obj      = session_obj["metadata"]
            user_id_str       = metadata_obj["celpipbro_user_id"]
            plan              = metadata_obj["plan"]
            customer_id       = session_obj["customer"]
            payment_intent_id = session_obj["payment_intent"]
        except (KeyError, TypeError) as parse_err:
            logger.error(
                "Webhook: could not parse session fields — %s | session=%s",
                parse_err,
                session_obj.get("id", "unknown"),
            )
            return

        logger.info(
            "checkout.session.completed: user_id=%s plan=%s customer=%s",
            user_id_str, plan, customer_id,
        )

        if not user_id_str or not plan:
            logger.error(
                "Webhook missing required metadata: user_id=%r plan=%r",
                user_id_str, plan,
            )
            return

        # ── 2. Validate user UUID and fetch user ────────────────────────────────
        try:
            user_uuid = uuid.UUID(str(user_id_str))
        except ValueError:
            logger.error("Invalid user UUID in webhook metadata: %r", user_id_str)
            return

        user = await db.get(User, user_uuid)
        if not user:
            logger.error("Webhook: user %s not found in DB.", user_id_str)
            return

        # ── 3. Upgrade user.plan ────────────────────────────────────────────────
        old_plan  = user.plan
        user.plan = str(plan)
        db.add(user)
        logger.info(
            "Upgrading user.plan: %s → %s for user=%s",
            old_plan, plan, user_id_str,
        )

        # ── 4. Upsert Subscription row ──────────────────────────────────────────
        result = await db.execute(
            select(Subscription)
            .where(Subscription.user_id == user.id)
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        existing_sub = result.scalar_one_or_none()

        if existing_sub:
            existing_sub.stripe_customer_id     = str(customer_id)       if customer_id       else existing_sub.stripe_customer_id
            existing_sub.stripe_subscription_id = str(payment_intent_id) if payment_intent_id else None
            existing_sub.plan                   = str(plan)
            existing_sub.status                 = "active"
            db.add(existing_sub)
        else:
            db.add(Subscription(
                user_id                = user.id,
                stripe_customer_id     = str(customer_id)       if customer_id       else None,
                stripe_subscription_id = str(payment_intent_id) if payment_intent_id else None,
                plan                   = str(plan),
                status                 = "active",
            ))

        # ── 5. Commit ───────────────────────────────────────────────────────────
        await db.commit()
        logger.info(
            "Plan upgrade committed: user=%s plan=%s customer=%s payment_intent=%s",
            user_id_str, plan, customer_id, payment_intent_id,
        )

        # ── 6. Publish Redis event → SSE push ───────────────────────────────────
        channel = f"{PLAN_CHANNEL_PREFIX}{user_id_str}"
        payload = json.dumps({"plan": str(plan), "user_id": user_id_str})
        await redis_client.publish(channel, payload)
        logger.info("Published plan-update to Redis channel %s", channel)

    except Exception as exc:
        await db.rollback()
        logger.exception("Failed to process checkout.session.completed: %s", exc)
        # Do not re-raise — Stripe must receive 200.
