from __future__ import annotations

import json
import logging
import uuid

import stripe

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
from app.services import retry_credit_service
from app.api.v1.billing.constants import (
    PLAN_CHANNEL_PREFIX,
    PLAN_PRICE_IDS,
    ADDON_MODULE_TASK_KEYS,
)

# Retry-credit grant per add-on purchase unit (cart quantity multiplies these).
# Sourced from config so any pack value can be tuned without editing webhook
# logic — see app.core.config.
_ADDON_RETRY_CREDIT_VALUES: dict[str, int] = {
    "writing_pack":  settings.WRITING_PACK_RETRY_CREDITS,
    "speaking_pack": settings.SPEAKING_PACK_RETRY_CREDITS,
    "custom_bundle": settings.CUSTOM_BUNDLE_RETRY_CREDITS,
    "mock_bundle":   settings.MOCK_BUNDLE_RETRY_CREDITS,
}

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
        # Belt-and-braces: the config validator already refuses to boot outside
        # APP_ENV='development' when the secret is missing, but the runtime
        # check stays here so a code regression that bypasses the validator
        # cannot accept unsigned events on staging/production.
        if settings.APP_ENV != "development":
            logger.error(
                "STRIPE_WEBHOOK_SECRET missing in APP_ENV=%r — refusing unsigned event.",
                settings.APP_ENV,
            )
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

    # Handlers RETURN a list of (channel, payload) tuples to publish on Redis.
    # We do NOT publish inside the handlers — if we did and the outer commit
    # later failed, the SSE event would have told the browser the user is now
    # Pro while the DB rolled back to starter. Defer publishing until after
    # db.commit() succeeds.
    pending_publishes: list[tuple[str, str]] = []

    try:
        obj = event.data.object
        if event_type == "checkout.session.completed":
            pending_publishes = await _handle_checkout_completed(obj, db) or []
        elif event_type == "charge.refunded":
            pending_publishes = await _handle_charge_refunded(obj, db) or []
        elif event_type == "charge.dispute.created":
            await _handle_dispute_created(obj)
        else:
            logger.info("Unhandled Stripe event type: %s", event_type)

        event_row = await db.get(StripeEvent, event_id)
        if event_row is not None:
            event_row.status = "processed"
        await db.commit()

        # Commit succeeded — now (and only now) fan out SSE events. A publish
        # failure here is best-effort: the DB state is already correct, and
        # the client will pick up the new state on its next poll/reload.
        if pending_publishes:
            try:
                redis_client = get_redis_pool()
            except Exception as exc:
                logger.warning("Redis pool unavailable — SSE push disabled: %s", exc)
                redis_client = None  # type: ignore[assignment]
            if redis_client is not None:
                for channel, payload in pending_publishes:
                    try:
                        await redis_client.publish(channel, payload)
                    except Exception as exc:
                        logger.warning("Redis publish failed for %s: %s", channel, exc)

        return JSONResponse({"status": "ok"})

    except WebhookPermanentError as exc:
        # Payload is malformed beyond repair — retrying will never succeed.
        # Discard partial writes, re-record the event as 'failed' so duplicate
        # deliveries still short-circuit, and ACK with 200 to stop Stripe
        # retrying. A human MUST investigate — a paid customer whose order
        # is stuck here will not be auto-provisioned, so we escalate to
        # Sentry beyond the local log line.
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
        try:
            import sentry_sdk
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("stripe_event_id",   event_id)
                scope.set_tag("stripe_event_type", event_type)
                scope.set_level("fatal")
                sentry_sdk.capture_exception(exc)
        except Exception:
            # Sentry not initialised (e.g. local dev) — log line above is
            # already the durable record.
            pass
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
    db: AsyncSession,
) -> list[tuple[str, str]]:
    """Process checkout.session.completed.

    Responsibilities:
    1. Upgrade user.plan if a plan item is in the cart.
    2. Upsert the Subscription row.
    3. For each add-on cart item, grant value on BOTH axes:
       a. Per-task attempt slots — AddonCredit rows consumed by the quota gate
          when plan quota is exhausted on a NEW prompt/mock slot.
       b. Retry-credit pool credits — consumed when REDOING an already-
          attempted prompt or retaking a mock.
    4. On a starter → pro upgrade, grant PRO_RETRY_CREDITS_GRANT once
       (idempotent on PaymentIntent id via the ledger source_ref).
    5. RETURN a list of (channel, payload) tuples that the caller must publish
       on Redis AFTER db.commit() succeeds. We never publish inside this
       function because a later commit failure would leave the browser
       believing a plan change happened when the DB rolled back.

    Returns an empty list when there is nothing to publish.
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
        return []

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
    pro_was_upgrade = False   # only grant Pro retry credits on starter → pro

    # Aggregate addon work BEFORE mutating state so a cart that submits two
    # equivalent line items (e.g. writing_pack:2 + writing_pack:3) produces
    # ONE AddonCredit row with the summed credit total and ONE retry-credit
    # grant with the summed amount — not two duplicate inserts that would
    # trip the uq_addon_credit_grant unique constraint, and not two grants
    # where the second short-circuits via the (reason, source_ref) idempotency
    # check leaving the user underpaid.
    addon_grants:  dict[tuple[str, str], int] = {}        # (addon_type, task_key) → credits_total
    retry_grants:  dict[str, tuple[str, int]] = {}        # source_ref → (reason, amount)

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
            pro_was_upgrade = (plan_slug == "pro" and old_plan != "pro")
            user.plan = plan_slug
            db.add(user)
            logger.info(
                "Webhook: upgrading user.plan %s → %s for user=%s",
                old_plan, plan_slug, user_id_str,
            )

        elif item_type in _ADDON_RETRY_CREDIT_VALUES:
            # Add-on packs grant value on TWO axes:
            #   (1) per-task attempt slots — written to addon_credits table,
            #       consumed by the quota gate when plan quota is exhausted
            #       on a NEW prompt or mock slot.
            #   (2) retry-credit pool credits — used for redoing already-
            #       attempted prompts and retaking mock tests.

            # ── (1) Per-task AddonCredit rows ───────────────────────────────
            credits_per_row = qty * settings.ADDON_CREDITS_PER_PACK
            task_keys_to_provision: list[str]

            if item_type == "custom_bundle":
                if not task_key:
                    raise WebhookPermanentError(
                        f"custom_bundle has no task_key in segment {segment!r}"
                    )
                task_keys_to_provision = [task_key]
            elif item_type == "mock_bundle":
                # Mock bundle grants pool credits keyed by skill; each qty=1
                # unlocks one full mock slot of each skill.
                task_keys_to_provision = [
                    "mock-test-speaking-addon",
                    "mock-test-writing-addon",
                ]
                # Mock bundle stores qty directly (= number of mock slots),
                # NOT qty × ADDON_CREDITS_PER_PACK.
                credits_per_row = qty
            else:
                # writing_pack / speaking_pack — expand to all module task keys
                task_keys_to_provision = list(ADDON_MODULE_TASK_KEYS[item_type])

            for tk in task_keys_to_provision:
                key = (item_type, tk)
                addon_grants[key] = addon_grants.get(key, 0) + credits_per_row

            # ── (2) Retry-credit pool grant ─────────────────────────────────
            credits      = qty * _ADDON_RETRY_CREDIT_VALUES[item_type]
            grant_source = f"{pi_str or 'unknown'}:{item_type}"
            reason       = f"addon_purchase_{item_type}"
            existing     = retry_grants.get(grant_source)
            retry_grants[grant_source] = (
                reason,
                (existing[1] if existing else 0) + credits,
            )

        else:
            raise WebhookPermanentError(
                f"Unknown cart item_type {item_type!r} in segment {segment!r}"
            )

    # ── Emit AddonCredit rows (idempotent on uq_addon_credit_grant) ───────────
    # A genuine first-time grant inserts the row. A webhook re-delivery for the
    # same PI (with a different event_id, so stripe_events idempotency does not
    # short-circuit) trips the unique constraint inside a savepoint — we log
    # the replay and continue. The outer transaction is unaffected, so plan
    # upgrade and retry-credit grants still commit.
    for (addon_type_k, task_key_k), credits_total in addon_grants.items():
        sp = await db.begin_nested()
        try:
            db.add(AddonCredit(
                user_id=user.id,
                stripe_pi_id=pi_str or "unknown",
                addon_type=addon_type_k,
                task_key=task_key_k,
                credits_total=credits_total,
                credits_used=0,
                status="active",
            ))
            await db.flush()
            await sp.commit()
            logger.info(
                "Webhook: provisioned AddonCredit pi=%s addon=%s task=%s credits=%d user=%s",
                pi_str, addon_type_k, task_key_k, credits_total, user_id_str,
            )
        except IntegrityError:
            await sp.rollback()
            logger.warning(
                "Webhook: AddonCredit replay skipped pi=%s addon=%s task=%s user=%s "
                "(row already exists — likely a webhook re-delivery)",
                pi_str, addon_type_k, task_key_k, user_id_str,
            )

    # ── Emit retry-credit grants (idempotent on (reason, source_ref)) ────────
    for grant_source, (reason, amount) in retry_grants.items():
        await retry_credit_service.grant(
            db,
            user_id=user.id,
            amount=amount,
            reason=reason,
            source_ref=grant_source,
        )
        logger.info(
            "Webhook: granted %d retry credits (source=%s) for user=%s",
            amount, grant_source, user_id_str,
        )

    # Pro plan grant — one-time at first activation. Idempotent on PI so a
    # webhook retry won't double-grant; the user can never re-trigger it by
    # downgrading and re-upgrading because the source_ref is bound to this PI.
    if pro_was_upgrade and pi_str:
        granted_to = await retry_credit_service.grant(
            db,
            user_id=user.id,
            amount=settings.PRO_RETRY_CREDITS_GRANT,
            reason="pro_grant",
            source_ref=pi_str,
        )
        logger.info(
            "Webhook: Pro plan activation granted %d retry credits (balance=%d) for user=%s",
            settings.PRO_RETRY_CREDITS_GRANT, granted_to, user_id_str,
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

    # Defer SSE publish: return the payload to the caller, who fires it AFTER
    # the outer transaction commits. Publishing here would race a commit
    # failure and tell the browser a plan change happened when it did not.
    channel     = f"{PLAN_CHANNEL_PREFIX}{user_id_str}"
    pub_payload = json.dumps({"plan": user.plan, "user_id": user_id_str})
    return [(channel, pub_payload)]


async def _handle_charge_refunded(
    charge_obj,
    db: AsyncSession,
) -> list[tuple[str, str]]:
    """Reverse retry-credit grants and downgrade plan on a full charge refund.

    Retry-credit reversal uses retry_credit_service.refund_by_source which
    looks up every grant ledger row tagged with `<pi>:<item_type>` and
    `<pi>` (for Pro grants) and books a single negative entry per source.
    The grant is clamped against the current balance, so the user keeps
    any credits they have already spent.

    Returns a list of (channel, payload) tuples that the caller must publish
    on Redis AFTER db.commit() succeeds. See _handle_checkout_completed for
    the rationale.
    """
    payment_intent_id = getattr(charge_obj, "payment_intent", None)
    if not payment_intent_id:
        logger.warning("charge.refunded without payment_intent — skipping.")
        return []

    pi_str = str(payment_intent_id)

    result = await db.execute(
        select(Subscription)
        .where(Subscription.stripe_payment_intent_id == pi_str)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    refund_user_id: uuid.UUID | None = sub.user_id if sub else None

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

    # Reverse every retry-credit grant whose source_ref starts with this PI.
    # Grants are stamped with either `<pi>` (Pro activation) or `<pi>:<addon>`
    # (add-on purchases); refund_by_source matches the exact source_ref, so
    # we reverse both forms with two calls.
    if refund_user_id is not None:
        await retry_credit_service.refund_by_source(
            db, user_id=refund_user_id, source_ref=pi_str, reason="refund_pro_grant",
        )
        for addon_type in _ADDON_RETRY_CREDIT_VALUES.keys():
            await retry_credit_service.refund_by_source(
                db,
                user_id=refund_user_id,
                source_ref=f"{pi_str}:{addon_type}",
                reason=f"refund_addon_{addon_type}",
            )

    # Mark per-task AddonCredit rows tied to this PaymentIntent as refunded
    # so the quota gate stops consuming them. Already-spent credits stay
    # spent — refund is best-effort, matching the retry-credit refund policy.
    addon_result = await db.execute(
        select(AddonCredit).where(AddonCredit.stripe_pi_id == pi_str)
    )
    addon_rows = addon_result.scalars().all()
    for row in addon_rows:
        row.status = "refunded"
        db.add(row)
    if addon_rows:
        logger.info(
            "Webhook: refunded %d AddonCredit rows for pi=%s", len(addon_rows), pi_str,
        )

    await db.flush()

    # Defer SSE publish — see _handle_checkout_completed for rationale.
    if sub:
        channel     = f"{PLAN_CHANNEL_PREFIX}{str(sub.user_id)}"
        pub_payload = json.dumps({"plan": "starter", "user_id": str(sub.user_id)})
        return [(channel, pub_payload)]
    return []


async def _handle_dispute_created(charge_obj) -> None:
    """Log a critical alert when a Stripe dispute is opened.

    No automatic plan change is made — disputes require manual admin review
    via the Stripe dashboard. We log AND escalate to Sentry so the alert
    routes through the same paging path as other CRITICAL errors instead of
    sitting in a logs tab no one watches.
    """
    customer_id = getattr(charge_obj, "customer", "unknown")
    charge_id   = getattr(charge_obj, "id",       "unknown")
    amount      = getattr(charge_obj, "amount",   0)
    currency    = getattr(charge_obj, "currency", "unknown")

    logger.critical(
        "STRIPE DISPUTE OPENED: customer=%s charge=%s amount=%s %s — manual review required.",
        customer_id, charge_id, amount, currency.upper(),
    )
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("stripe_customer_id", str(customer_id))
            scope.set_tag("stripe_charge_id",   str(charge_id))
            scope.set_extra("amount_minor",     amount)
            scope.set_extra("currency",         currency)
            scope.set_level("fatal")
            sentry_sdk.capture_message(
                f"Stripe dispute opened: charge={charge_id} customer={customer_id}",
            )
    except Exception:
        pass
