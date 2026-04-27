# ─────────────────────────────────────────────────────────────────────────────
# billing/routes/webhook.py — POST /billing/webhook
#
# Receives Stripe webhook events, verifies the signature, enforces idempotency,
# and dispatches to the appropriate event handler.
#
# Supported events:
#   checkout.session.completed  → upgrade user plan, upsert Subscription row,
#                                  publish Redis event for SSE live push
#   charge.refunded             → downgrade user back to starter
#
# Error handling policy:
#   - 400 when signature fails (Stripe knows not to retry forever)
#   - 500 when processing fails after signature passes, so Stripe retries
#   - 200 once the event row is committed in stripe_events (idempotent)
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
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db, get_redis_pool
from app.models.user import User
from app.models.subscription import Subscription
from app.models.stripe_event import StripeEvent
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

    Signature verification via ``Stripe-Signature`` header is MANDATORY in
    production. In development, a missing secret is allowed with a warning so
    the Stripe CLI can forward without configuration.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    secret = settings.STRIPE_WEBHOOK_SECRET

    if secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, secret)
        except Exception as exc:
            logger.warning("Stripe webhook signature verification failed: %s", exc)
            raise HTTPException(status_code=400, detail="Invalid Stripe signature.")
    else:
        if settings.APP_ENV == "production":
            # Config validator already prevents this, but belt-and-braces.
            logger.error("STRIPE_WEBHOOK_SECRET missing in production.")
            raise HTTPException(status_code=500, detail="Webhook not configured.")
        logger.warning(
            "STRIPE_WEBHOOK_SECRET is not set — skipping signature verification. "
            "This is ONLY acceptable in local development."
        )
        event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)  # type: ignore[attr-defined]

    # stripe>=5: StripeObject no longer inherits dict — use attribute access.
    event_id   = getattr(event, "id", None)
    event_type = getattr(event, "type", None)
    if not event_id or not event_type:
        raise HTTPException(status_code=400, detail="Malformed Stripe event.")

    # ── Idempotency: short-circuit if we have already seen this event_id ──────
    existing = await db.get(StripeEvent, event_id)
    if existing is not None:
        logger.info(
            "Duplicate Stripe webhook ignored: id=%s type=%s", event_id, event_type
        )
        return JSONResponse({"status": "duplicate"})

    logger.debug("Stripe webhook received: %s (%s)", event_type, event_id)

    # Record the event row. If two deliveries race, the unique PK makes one
    # INSERT win and the other raise IntegrityError — treat that as duplicate.
    db.add(
        StripeEvent(
            event_id=event_id,
            event_type=event_type,
            status="processing",
        )
    )
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        logger.info("Race-duplicate Stripe webhook ignored: id=%s", event_id)
        return JSONResponse({"status": "duplicate"})

    # Non-fatal Redis guard: plan upgrade must succeed even if Redis is down.
    try:
        redis_client = get_redis_pool()
    except Exception as redis_err:
        logger.warning("Redis pool unavailable — SSE push disabled: %s", redis_err)
        redis_client = None  # type: ignore[assignment]

    try:
        if event_type == "checkout.session.completed":
            # stripe>=5: attribute access instead of dict-style
            await _handle_checkout_completed(
                session_obj=event.data.object,
                db=db,
                redis_client=redis_client,
            )
        elif event_type == "charge.refunded":
            await _handle_charge_refunded(
                charge_obj=event.data.object,
                db=db,
                redis_client=redis_client,
            )
        else:
            logger.info("Unhandled Stripe event type: %s", event_type)

        # Mark the event row as processed and commit everything atomically.
        event_row = await db.get(StripeEvent, event_id)
        if event_row is not None:
            event_row.status = "processed"
        await db.commit()
        return JSONResponse({"status": "ok"})

    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        await db.rollback()
        logger.exception(
            "Failed to process Stripe event %s (%s): %s", event_id, event_type, exc
        )
        # 500 so Stripe retries with back-off; no stripe_events row persisted.
        raise HTTPException(status_code=500, detail="Webhook processing failed.")


# ── Event handlers ────────────────────────────────────────────────────────────


async def _handle_checkout_completed(
    session_obj,
    db: AsyncSession,
    redis_client: aioredis.Redis,
) -> None:
    """Process a ``checkout.session.completed`` event."""
    try:
        # stripe>=5: StripeObject uses attribute access, not dict subscript.
        metadata_obj = getattr(session_obj, "metadata", None) or {}
        # metadata is a plain dict in the Stripe SDK, so .get() is fine here.
        user_id_str = metadata_obj.get("celpipbro_user_id")
        plan        = metadata_obj.get("plan")
        customer_id       = getattr(session_obj, "customer", None)
        payment_intent_id = getattr(session_obj, "payment_intent", None)
    except (AttributeError, TypeError) as parse_err:
        logger.error(
            "Webhook: could not parse session fields — %s | session=%s",
            parse_err,
            getattr(session_obj, "id", "unknown"),
        )
        return

    if not user_id_str or not plan:
        logger.error(
            "Webhook missing required metadata: user_id=%r plan=%r",
            user_id_str,
            plan,
        )
        return

    if plan not in ("starter", "pro", "ultra"):
        logger.error("Webhook: rejecting unknown plan %r", plan)
        return

    try:
        user_uuid = uuid.UUID(str(user_id_str))
    except ValueError:
        logger.error("Invalid user UUID in webhook metadata: %r", user_id_str)
        return

    user = await db.get(User, user_uuid)
    if not user:
        logger.error("Webhook: user %s not found in DB.", user_id_str)
        return

    old_plan = user.plan
    user.plan = str(plan)
    db.add(user)
    logger.info(
        "Upgrading user.plan: %s → %s for user=%s", old_plan, plan, user_id_str
    )

    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user.id)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    existing_sub = result.scalar_one_or_none()

    if existing_sub:
        if customer_id:
            existing_sub.stripe_customer_id = str(customer_id)
        existing_sub.stripe_payment_intent_id = (
            str(payment_intent_id) if payment_intent_id else None
        )
        existing_sub.plan = str(plan)
        existing_sub.status = "active"
        existing_sub.payment_type = "one_time"
        db.add(existing_sub)
    else:
        db.add(
            Subscription(
                user_id=user.id,
                stripe_customer_id=str(customer_id) if customer_id else None,
                stripe_payment_intent_id=(
                    str(payment_intent_id) if payment_intent_id else None
                ),
                plan=str(plan),
                status="active",
                payment_type="one_time",
            )
        )

    await db.flush()

    # Publish Redis plan-update — SSE listeners push the change to the browser.
    if redis_client is not None:
        channel = f"{PLAN_CHANNEL_PREFIX}{user_id_str}"
        pub_payload = json.dumps({"plan": str(plan), "user_id": user_id_str})
        try:
            await redis_client.publish(channel, pub_payload)
        except Exception as pub_exc:
            # Redis hiccup should not block a committed plan upgrade.
            logger.warning("Redis publish failed for %s: %s", channel, pub_exc)
    else:
        logger.warning("Redis unavailable — skipping SSE push for user=%s", user_id_str)


async def _handle_charge_refunded(
    charge_obj,
    db: AsyncSession,
    redis_client: aioredis.Redis,
) -> None:
    """Downgrade the user's plan back to starter when a charge is refunded."""
    # stripe>=5: attribute access, not dict-style .get()
    payment_intent_id = getattr(charge_obj, "payment_intent", None)
    if not payment_intent_id:
        logger.warning("charge.refunded without payment_intent — skipping.")
        return

    result = await db.execute(
        select(Subscription)
        .where(Subscription.stripe_payment_intent_id == str(payment_intent_id))
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        logger.warning(
            "charge.refunded: no subscription row for payment_intent=%s",
            payment_intent_id,
        )
        return

    user = await db.get(User, sub.user_id)
    if user is None:
        return

    user.plan = "starter"
    sub.status = "refunded"
    db.add(user)
    db.add(sub)
    await db.flush()

    channel = f"{PLAN_CHANNEL_PREFIX}{str(user.id)}"
    pub_payload = json.dumps({"plan": "starter", "user_id": str(user.id)})
    if redis_client is not None:
        try:
            await redis_client.publish(channel, pub_payload)
        except Exception as pub_exc:
            logger.warning("Redis publish failed for %s: %s", channel, pub_exc)
    else:
        logger.warning("Redis unavailable — skipping SSE push for user=%s", user.id)
