"""
Nightly Stripe ↔ DB reconciliation task.

Webhooks can be missed (network hiccup, Stripe retry window exhausted, etc.).
This Beat-scheduled task is a safety net: it walks every paid user, calls
``stripe.PaymentIntent.retrieve`` to check the PI's real status, and downgrades
any user whose payment has been refunded but whose ``plan`` column was never
reset (i.e. the ``charge.refunded`` webhook was lost).

Schedule: every night at 02:00 UTC (configured in ``celery_app.py``).

Design notes
────────────
- Uses a *synchronous* SQLAlchemy engine (same pattern as ``speaking_tasks.py``).
  Celery workers are sync by default; spinning up asyncio for a batch task
  would add overhead without benefit here.
- One Stripe API call per paid user — this is intentional.  At 1k–10k MAU
  only a small fraction will be on paid plans; the call count is low.
  Add a Redis-cache layer (TTL 24h) if you ever need to run this more frequently.
- The task is idempotent: running it twice produces the same result.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
import structlog
from celery import shared_task

from app.core.config import settings
from app.workers._sync_db import get_sync_engine

logger = structlog.get_logger(__name__)


# ── Task ──────────────────────────────────────────────────────────────────────

@shared_task(
    name="app.workers.reconciliation_tasks.reconcile_stripe_plans",
    queue="reconciliation",
    acks_late=True,
    max_retries=0,  # do not auto-retry — each run is a full sweep
)
def reconcile_stripe_plans() -> dict:
    """
    Walk every paid user, verify their Stripe PaymentIntent is still charged,
    downgrade refunded users, and write a reconciliation_runs audit row.
    """
    import stripe

    stripe.api_key = settings.STRIPE_SECRET_KEY

    engine = get_sync_engine()
    users_checked = 0
    corrections_made = 0
    error_message: str | None = None

    log = logger.bind(task="reconcile_stripe_plans")
    log.info("reconciliation_run.started")

    try:
        with engine.begin() as conn:
            # ── 1. Fetch paid users with an active subscription ───────────────
            rows = conn.execute(
                sa.text(
                    """
                    SELECT u.id        AS user_id,
                           u.plan      AS plan,
                           s.id        AS sub_id,
                           s.stripe_payment_intent_id
                    FROM   users u
                    JOIN   subscriptions s ON s.user_id = u.id
                    WHERE  u.plan != 'starter'
                    AND    s.status = 'active'
                    ORDER  BY u.id
                    """
                )
            ).fetchall()

            users_checked = len(rows)
            log.info("reconciliation_run.users_checked", count=users_checked)

            for row in rows:
                user_id: uuid.UUID = row.user_id
                sub_id: uuid.UUID = row.sub_id
                pi_id: str | None = row.stripe_payment_intent_id

                if not pi_id:
                    log.warning(
                        "reconciliation_run.no_payment_intent",
                        user_id=str(user_id),
                    )
                    continue

                # ── 2. Ask Stripe for the PI's real status ────────────────────
                # PaymentIntent.charges was removed from the default Stripe API
                # version in 2022-11-15+. We expand `latest_charge` instead and
                # read `refunded` from that object.
                try:
                    pi = stripe.PaymentIntent.retrieve(
                        pi_id,
                        expand=["latest_charge"],
                    )
                except stripe.StripeError as exc:
                    log.warning(
                        "reconciliation_run.stripe_error",
                        user_id=str(user_id),
                        pi_id=pi_id,
                        error=str(exc),
                    )
                    continue

                # ── 3. Determine if the payment has been refunded ─────────────
                # Two signals: PI status == "canceled", or the latest charge is
                # flagged refunded (matches how _handle_charge_refunded works).
                pi_canceled = pi.get("status") == "canceled"
                charge_refunded = False
                latest_charge = pi.get("latest_charge")
                # When expanded, latest_charge is a Charge object; when not, a
                # string id. We only inspect the object form — the expand above
                # is what gives us .refunded without another round-trip.
                if isinstance(latest_charge, dict) or hasattr(latest_charge, "get"):
                    charge_refunded = bool(latest_charge.get("refunded", False))

                if not (pi_canceled or charge_refunded):
                    continue  # payment still good — nothing to do

                # ── 4. Downgrade the user ─────────────────────────────────────
                log.warning(
                    "reconciliation_run.correcting",
                    user_id=str(user_id),
                    pi_id=pi_id,
                    pi_status=pi.get("status"),
                    charge_refunded=charge_refunded,
                )

                conn.execute(
                    sa.text(
                        "UPDATE users SET plan='starter', updated_at=NOW() "
                        "WHERE id=:uid"
                    ),
                    {"uid": user_id},
                )
                conn.execute(
                    sa.text(
                        "UPDATE subscriptions SET status='refunded', updated_at=NOW() "
                        "WHERE id=:sid"
                    ),
                    {"sid": sub_id},
                )
                corrections_made += 1

                try:
                    import sentry_sdk
                    sentry_sdk.capture_message(
                        f"Reconciliation: downgraded user {user_id} "
                        f"(PI {pi_id} is {pi.get('status')})",
                        level="warning",
                    )
                except Exception:
                    pass

    except Exception as exc:
        error_message = str(exc)[:2000]
        log.exception("reconciliation_run.fatal_error", error=error_message)
    finally:
        # ── 5. Write audit row (even if the run failed partway through) ───────
        try:
            with engine.begin() as conn:
                conn.execute(
                    sa.text(
                        """
                        INSERT INTO reconciliation_runs
                            (id, run_at, users_checked, corrections_made, error_message)
                        VALUES
                            (:id, :run_at, :checked, :corrections, :err)
                        """
                    ),
                    {
                        "id": uuid.uuid4(),
                        "run_at": datetime.now(timezone.utc),
                        "checked": users_checked,
                        "corrections": corrections_made,
                        "err": error_message,
                    },
                )
        except Exception as audit_exc:
            log.error(
                "reconciliation_run.audit_write_failed", error=str(audit_exc)
            )

    log.info(
        "reconciliation_run.finished",
        users_checked=users_checked,
        corrections_made=corrections_made,
        error=error_message,
    )
    return {
        "users_checked": users_checked,
        "corrections_made": corrections_made,
        "error_message": error_message,
    }
