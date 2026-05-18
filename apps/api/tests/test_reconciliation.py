"""
Integration tests for the nightly Stripe ↔ DB reconciliation task.

Uses the synchronous engine directly (same as the task itself) so the test
runs without an asyncio event loop.  Stripe is fully mocked — no real API
calls are made.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
import sqlalchemy as sa


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_pi(*, status: str = "succeeded", refunded: bool = False) -> MagicMock:
    """Return a mock Stripe PaymentIntent object.

    The task expands `latest_charge` (the modern Stripe API shape — the old
    `charges.data` list was removed in 2022-11-15+), so we mock that field as
    a Charge-like object with a `.refunded` flag.
    """
    charge = MagicMock()
    charge.get.side_effect = lambda k, d=None: {"refunded": refunded}.get(k, d)

    pi = MagicMock()
    pi.get.side_effect = lambda k, d=None: {
        "status": status,
        "latest_charge": charge,
    }.get(k, d)
    return pi


def _seed(conn, *, plan: str = "pro") -> tuple[uuid.UUID, uuid.UUID, str]:
    """Insert a minimal user + subscription row; return (user_id, sub_id, pi_id)."""
    uid = uuid.uuid4()
    sid = uuid.uuid4()
    pi_id = f"pi_{uid.hex[:16]}"

    conn.execute(
        sa.text(
            "INSERT INTO users (id, clerk_user_id, email, plan, is_admin, streak_days) "
            "VALUES (:id, :ck, :email, :plan, false, 0)"
        ),
        {"id": uid, "ck": f"clerk_{uid.hex[:8]}", "email": f"{uid.hex[:8]}@test.com", "plan": plan},
    )
    conn.execute(
        sa.text(
            "INSERT INTO subscriptions "
            "(id, user_id, stripe_payment_intent_id, plan, status, payment_type) "
            "VALUES (:id, :uid, :pi, :plan, 'active', 'one_time')"
        ),
        {"id": sid, "uid": uid, "pi": pi_id, "plan": plan},
    )
    return uid, sid, pi_id


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def sync_engine():
    """Return the workers' shared sync engine (reuses existing pool)."""
    from app.workers._sync_db import get_sync_engine
    return get_sync_engine()


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestReconcileStripePlans:
    def test_refunded_pi_downgrades_user(self, sync_engine):
        """A user whose PI is refunded should be downgraded to starter."""
        with sync_engine.begin() as conn:
            uid, sid, pi_id = _seed(conn, plan="pro")

        mock_pi = _make_pi(status="succeeded", refunded=True)

        with patch("stripe.PaymentIntent.retrieve", return_value=mock_pi):
            from app.workers.reconciliation_tasks import reconcile_stripe_plans
            result = reconcile_stripe_plans()

        assert result["corrections_made"] >= 1

        with sync_engine.connect() as conn:
            row = conn.execute(
                sa.text("SELECT plan FROM users WHERE id=:id"), {"id": uid}
            ).fetchone()
            sub = conn.execute(
                sa.text("SELECT status FROM subscriptions WHERE id=:id"), {"id": sid}
            ).fetchone()

        assert row.plan == "starter"
        assert sub.status == "refunded"

    def test_canceled_pi_downgrades_user(self, sync_engine):
        """A user whose PI status is 'canceled' should also be downgraded."""
        with sync_engine.begin() as conn:
            uid, sid, pi_id = _seed(conn, plan="pro")

        mock_pi = _make_pi(status="canceled", refunded=False)

        with patch("stripe.PaymentIntent.retrieve", return_value=mock_pi):
            from app.workers.reconciliation_tasks import reconcile_stripe_plans
            result = reconcile_stripe_plans()

        assert result["corrections_made"] >= 1

        with sync_engine.connect() as conn:
            row = conn.execute(
                sa.text("SELECT plan FROM users WHERE id=:id"), {"id": uid}
            ).fetchone()

        assert row.plan == "starter"

    def test_active_pi_leaves_user_untouched(self, sync_engine):
        """A user whose PI is still active should NOT be downgraded."""
        with sync_engine.begin() as conn:
            uid, _sid, _pi_id = _seed(conn, plan="pro")

        mock_pi = _make_pi(status="succeeded", refunded=False)

        with patch("stripe.PaymentIntent.retrieve", return_value=mock_pi):
            from app.workers.reconciliation_tasks import reconcile_stripe_plans
            reconcile_stripe_plans()

        with sync_engine.connect() as conn:
            row = conn.execute(
                sa.text("SELECT plan FROM users WHERE id=:id"), {"id": uid}
            ).fetchone()

        assert row.plan == "pro"  # unchanged

    def test_audit_row_always_written(self, sync_engine):
        """reconciliation_runs row is written even when no corrections are needed."""
        before_count = 0
        with sync_engine.connect() as conn:
            before_count = conn.execute(
                sa.text("SELECT COUNT(*) FROM reconciliation_runs")
            ).scalar()

        mock_pi = _make_pi(status="succeeded", refunded=False)

        with patch("stripe.PaymentIntent.retrieve", return_value=mock_pi):
            from app.workers.reconciliation_tasks import reconcile_stripe_plans
            reconcile_stripe_plans()

        with sync_engine.connect() as conn:
            after_count = conn.execute(
                sa.text("SELECT COUNT(*) FROM reconciliation_runs")
            ).scalar()

        assert after_count == before_count + 1

    def test_stripe_api_error_does_not_crash_run(self, sync_engine):
        """A Stripe API error on one user is logged and skipped; run still completes."""
        import stripe

        with sync_engine.begin() as conn:
            _seed(conn, plan="pro")

        with patch(
            "stripe.PaymentIntent.retrieve",
            side_effect=stripe.StripeError("timeout"),
        ):
            from app.workers.reconciliation_tasks import reconcile_stripe_plans
            result = reconcile_stripe_plans()

        # Run should complete without raising; corrections_made == 0 (skipped user)
        assert result["corrections_made"] == 0
        assert result["error_message"] is None  # not a fatal error
