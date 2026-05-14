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
from app.models.addon_credit import AddonCredit
from app.api.v1.billing.constants import (
    PLAN_CHANNEL_PREFIX,
    ADDON_MODULE_TASK_KEYS,
    PLAN_PRICE_IDS,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class WebhookPermanentError(Exception):
    """Webhook payload is malformed in a way that retrying cannot fix.

    The Stripe event is recorded as 'failed' and acknowledged with HTTP 200 so
    Stripe stops retrying — the failure needs manual investigation, not a retry.
    """


# Plans that can legitimately appear in a paid checkout. 'starter' is the free
# default tier and is never *purchased*, so it is intentionally excluded.
_VALID_PURCHASED_PLANS: frozenset[str] = frozenset(PLAN_PRICE_IDS.keys())


def _normalize_plan_slug(raw: str | None) -> str:
    """Normalize a cart plan slug and validate it against known plans.

    Checkout encodes the plan slug into session metadata; client ids such as
    'pro-plan' or 'Pro' must resolve to the canonical 'pro'. An unrecognised
    slug is a permanent metadata defect (it would also violate the users.plan
    CHECK constraint), so raise rather than persist a bad value.
    """
    candidate = (raw or "pro").strip().lower().replace("-", "_")
    if candidate.endswith("_plan"):
        candidate = candidate[: -len("_plan")]
    if candidate not in _VALID_PURCHASED_PLANS:
        raise WebhookPermanentError(
            f"Unknown plan slug in checkout metadata: {raw!r} (normalized: {candidate!r})"
        )
    return candidate


# ── Route ──────────────────────────────────────────────────────────────────────


@router.post("/billing/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    db:      Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    """Stripe webhook receiver.

    Signature verification is MANDATORY in production.
    In development a missing secret is accepted with a warning (Stripe CLI flow).

    Supported events:
      checkout.session.completed  → plan upgrade + addon credit provisioning
      charge.refunded             → plan downgrade + addon credit refund
      charge.dispute.created      → admin alert log (no automatic plan change)

    Error policy:
      400 on signature failure   (tells Stripe to not retry this payload)
      500 on processing failure  (Stripe will retry with back-off)
      200 once committed         (idempotency guard via stripe_events table)
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
        if settings.APP_ENV == "production":
            logger.error("STRIPE_WEBHOOK_SECRET missing in production.")
            raise HTTPException(status_code=500, detail="Webhook not configured.")
        logger.warning(
            "STRIPE_WEBHOOK_SECRET not set — skipping signature verification. "
            "Acceptable in local development only."
        )
        event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)  # type: ignore[attr-defined]

    event_id   = getattr(event, "id",   None)
    event_type = getattr(event, "type", None)
    if not event_id or not event_type:
        raise HTTPException(status_code=400, detail="Malformed Stripe event.")

    # Idempotency: short-circuit on already-seen event_id.
    if await db.get(StripeEvent, event_id) is not None:
        logger.info("Duplicate Stripe webhook ignored: id=%s type=%s", event_id, event_type)
        return JSONResponse({"status": "duplicate"})

    db.add(StripeEvent(event_id=event_id, event_type=event_type, status="processing"))
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        logger.info("Race-duplicate Stripe webhook ignored: id=%s", event_id)
        return JSONResponse({"status": "duplicate"})

    try:
        redis_client = get_redis_pool()
    except Exception as exc:
        logger.warning("Redis pool unavailable — SSE push disabled: %s", exc)
        redis_client = None  # type: ignore[assignment]

    try:
        obj = event.data.object
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(obj, db, redis_client)
        elif event_type == "charge.refunded":
            await _handle_charge_refunded(obj, db, redis_client)
        elif event_type == "charge.dispute.created":
            await _handle_dispute_created(obj)
        else:
            logger.info("Unhandled Stripe event type: %s", event_type)

        event_row = await db.get(StripeEvent, event_id)
        if event_row is not None:
            event_row.status = "processed"
        await db.commit()
        return JSONResponse({"status": "ok"})

    except WebhookPermanentError as exc:
        # Payload is malformed beyond repair — retrying will never succeed.
        # Discard partial writes, re-record the event as 'failed' so duplicate
        # deliveries still short-circuit, and ACK with 200 to stop Stripe
        # retrying. A human needs to investigate via the logged CRITICAL line.
        await db.rollback()
        db.add(StripeEvent(
            event_id=event_id,
            event_type=event_type,
            status="failed",
            error_message=str(exc)[:2000],
        ))
        await db.commit()
        logger.critical(
            "Stripe webhook permanently failed: id=%s type=%s — %s",
            event_id, event_type, exc,
        )
        return JSONResponse({"status": "failed", "detail": str(exc)})

    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        # Unexpected / transient failure — roll back so the event row is gone
        # and Stripe's retry re-processes the delivery from scratch.
        await db.rollback()
        logger.exception("Failed to process Stripe event %s (%s): %s", event_id, event_type, exc)
        raise HTTPException(status_code=500, detail="Webhook processing failed.")


# ── Event handlers ─────────────────────────────────────────────────────────────


async def _handle_checkout_completed(
    session_obj,
    db:           AsyncSession,
    redis_client: aioredis.Redis | None,
) -> None:
    """Process checkout.session.completed.

    Responsibilities:
    1. Upgrade user.plan if a plan item is in the cart.
    2. Upsert the Subscription row.
    3. Provision AddonCredit rows for all addon items:
       - writing_pack / speaking_pack → one row per task key (5 credits × qty each)
       - custom_bundle                → one row for the specified task key
    4. Publish a Redis SSE event so the browser updates live.
    """
    # Only provision once Stripe confirms the money actually moved. For card
    # checkouts payment_status is 'paid' on completion; async payment methods
    # can fire 'completed' while still 'unpaid' — those must NOT provision.
    payment_status = getattr(session_obj, "payment_status", None)
    if payment_status not in ("paid", "no_payment_required"):
        logger.warning(
            "Webhook: checkout.session.completed with payment_status=%r — "
            "skipping provisioning for session=%s",
            payment_status, getattr(session_obj, "id", "unknown"),
        )
        return

    try:
        raw_metadata      = getattr(session_obj, "metadata", None)
        user_id_str       = getattr(raw_metadata, "celpipbro_user_id", None)
        items_str         = getattr(raw_metadata, "items", "") or ""
        payment_type      = getattr(raw_metadata, "payment_type", "one_time") or "one_time"
        customer_id       = getattr(session_obj, "customer", None)
        payment_intent_id = getattr(session_obj, "payment_intent", None)
    except (AttributeError, TypeError) as exc:
        raise WebhookPermanentError(
            f"Could not parse session fields for session "
            f"{getattr(session_obj, 'id', 'unknown')}: {exc}"
        ) from exc

    if not user_id_str or not items_str:
        raise WebhookPermanentError(
            f"Missing required metadata: user_id={user_id_str!r} items={items_str!r}"
        )

    try:
        user_uuid = uuid.UUID(str(user_id_str))
    except ValueError:
        raise WebhookPermanentError(f"Invalid user UUID in metadata: {user_id_str!r}")

    user = await db.get(User, user_uuid)
    if not user:
        # The user row is created at checkout time on the primary DB, so this
        # should not happen. Raise (→ 500 → Stripe retry) rather than silently
        # dropping a paid order.
        raise RuntimeError(f"Webhook: user {user_id_str} not found in DB — cannot provision")

    pi_str      = str(payment_intent_id) if payment_intent_id else None
    plan_in_cart: str | None = None

    for segment in items_str.split("|"):
        parts = segment.split(":")
        if len(parts) < 3:
            # Cart metadata is server-generated; a malformed segment is a code
            # defect, not user input. Fail loudly rather than under-provision.
            raise WebhookPermanentError(f"Malformed cart segment in metadata: {segment!r}")

        item_type, qty_str, task_key_raw = parts[0], parts[1], parts[2]

        try:
            qty = int(qty_str)
        except ValueError:
            raise WebhookPermanentError(f"Non-integer quantity in cart segment: {segment!r}")

        task_key = None if task_key_raw == "null" else task_key_raw

        if item_type == "plan":
            plan_slug    = _normalize_plan_slug(task_key)
            plan_in_cart = plan_slug
            old_plan  = user.plan
            user.plan = plan_slug
            db.add(user)
            logger.info(
                "Webhook: upgrading user.plan %s → %s for user=%s",
                old_plan, plan_slug, user_id_str,
            )

        elif item_type in ("writing_pack", "speaking_pack", "custom_bundle"):
            credits_per_row = qty * settings.ADDON_CREDITS_PER_PACK
            task_keys_to_provision: list[str]

            if item_type == "custom_bundle":
                if not task_key:
                    raise WebhookPermanentError(
                        f"custom_bundle has no task_key in segment {segment!r}"
                    )
                task_keys_to_provision = [task_key]
            else:
                task_keys_to_provision = list(ADDON_MODULE_TASK_KEYS.get(item_type, frozenset()))

            for tk in task_keys_to_provision:
                db.add(AddonCredit(
                    user_id=user.id,
                    stripe_pi_id=pi_str or "unknown",
                    addon_type=item_type,
                    task_key=tk,
                    credits_total=credits_per_row,
                    credits_used=0,
                    status="active",
                ))

            logger.info(
                "Webhook: provisioned %d AddonCredit rows (%s, %d credits each) for user=%s",
                len(task_keys_to_provision), item_type, credits_per_row, user_id_str,
            )

        elif item_type == "mock_bundle":
            # Provision general-pool credits for speaking and writing.
            # Each purchase of qty=1 adds 1 credit to each pool key.
            # The quota enforcer consumes from these pool keys when the plan quota is exhausted.
            for skill in ("speaking", "writing"):
                pool_key = f"mock-test-{skill}-addon"
                db.add(AddonCredit(
                    user_id=user.id,
                    stripe_pi_id=pi_str or "unknown",
                    addon_type="mock_bundle",
                    task_key=pool_key,
                    credits_total=qty,
                    credits_used=0,
                    status="active",
                ))

            logger.info(
                "Webhook: provisioned mock_bundle +%d speaking + %d writing pool credits for user=%s",
                qty, qty, user_id_str,
            )

    # Upsert Subscription row for plan purchases.
    if plan_in_cart:
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
            existing_sub.stripe_payment_intent_id = pi_str
            existing_sub.plan         = plan_in_cart
            existing_sub.status       = "active"
            existing_sub.payment_type = payment_type
            db.add(existing_sub)
        else:
            db.add(Subscription(
                user_id=user.id,
                stripe_customer_id=str(customer_id) if customer_id else None,
                stripe_payment_intent_id=pi_str,
                plan=plan_in_cart,
                status="active",
                payment_type=payment_type,
            ))

    await db.flush()

    if redis_client is not None:
        channel     = f"{PLAN_CHANNEL_PREFIX}{user_id_str}"
        pub_payload = json.dumps({"plan": user.plan, "user_id": user_id_str})
        try:
            await redis_client.publish(channel, pub_payload)
        except Exception as exc:
            logger.warning("Redis publish failed for %s: %s", channel, exc)
    else:
        logger.warning("Redis unavailable — skipping SSE push for user=%s", user_id_str)


async def _handle_charge_refunded(
    charge_obj,
    db:           AsyncSession,
    redis_client: aioredis.Redis | None,
) -> None:
    """Downgrade plan and refund addon credits on a full charge refund."""
    payment_intent_id = getattr(charge_obj, "payment_intent", None)
    if not payment_intent_id:
        logger.warning("charge.refunded without payment_intent — skipping.")
        return

    pi_str = str(payment_intent_id)

    result = await db.execute(
        select(Subscription)
        .where(Subscription.stripe_payment_intent_id == pi_str)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()

    if sub:
        user = await db.get(User, sub.user_id)
        if user:
            user.plan = "starter"
            db.add(user)
        sub.status = "refunded"
        db.add(sub)
        logger.info(
            "Webhook: plan refund — user=%s downgraded to starter, sub=%s",
            sub.user_id, sub.id,
        )

    # Refund all addon credits tied to this PaymentIntent.
    addon_result = await db.execute(
        select(AddonCredit).where(AddonCredit.stripe_pi_id == pi_str)
    )
    addon_rows = addon_result.scalars().all()
    for row in addon_rows:
        row.status = "refunded"
        db.add(row)

    if addon_rows:
        logger.info(
            "Webhook: refunded %d AddonCredit rows for pi=%s", len(addon_rows), pi_str
        )

    await db.flush()

    if sub and redis_client is not None:
        channel     = f"{PLAN_CHANNEL_PREFIX}{str(sub.user_id)}"
        pub_payload = json.dumps({"plan": "starter", "user_id": str(sub.user_id)})
        try:
            await redis_client.publish(channel, pub_payload)
        except Exception as exc:
            logger.warning("Redis publish failed for %s: %s", channel, exc)


async def _handle_dispute_created(charge_obj) -> None:
    """Log a critical alert when a Stripe dispute is opened.

    No automatic plan change is made — disputes require manual admin review
    via the Stripe dashboard.  Future: send an admin notification email here.
    """
    customer_id = getattr(charge_obj, "customer", "unknown")
    charge_id   = getattr(charge_obj, "id",       "unknown")
    amount      = getattr(charge_obj, "amount",   0)
    currency    = getattr(charge_obj, "currency", "unknown")

    logger.critical(
        "STRIPE DISPUTE OPENED: customer=%s charge=%s amount=%s %s — manual review required.",
        customer_id, charge_id, amount, currency.upper(),
    )
