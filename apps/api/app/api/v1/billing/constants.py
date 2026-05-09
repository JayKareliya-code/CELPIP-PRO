from __future__ import annotations

import stripe

from app.core.config import settings

# ── Stripe SDK init ───────────────────────────────────────────────────────────

stripe.api_key = settings.STRIPE_SECRET_KEY

# ── Plan → Stripe Price ID mapping ───────────────────────────────────────────

PLAN_PRICE_IDS: dict[str, str] = {
    "pro": settings.STRIPE_PRO_PRICE_ID,
}
"""Maps plan slug → Stripe Price ID (one-time payment price)."""

# ── Addon → Stripe Price ID mapping ──────────────────────────────────────────

ADDON_PRICE_IDS: dict[str, str] = {
    "writing_pack":  settings.STRIPE_WRITING_PACK_PRICE_ID,
    "speaking_pack": settings.STRIPE_SPEAKING_PACK_PRICE_ID,
    "custom_bundle": settings.STRIPE_CUSTOM_BUNDLE_PRICE_ID,
    "mock_bundle":   settings.STRIPE_MOCK_BUNDLE_PRICE_ID,
}
"""Maps addon type slug → Stripe Price ID (one-time payment price)."""

# ── Known task keys (validated at checkout) ───────────────────────────────────

SPEAKING_TASK_KEYS: frozenset[str] = frozenset({
    "speaking-task-1", "speaking-task-2", "speaking-task-3", "speaking-task-4",
    "speaking-task-5", "speaking-task-6", "speaking-task-7", "speaking-task-8",
})

WRITING_TASK_KEYS: frozenset[str] = frozenset({
    "writing-task-1", "writing-task-2",
})

KNOWN_TASK_KEYS: frozenset[str] = SPEAKING_TASK_KEYS | WRITING_TASK_KEYS
"""All valid task keys accepted in a custom_bundle cart item."""

# ── Mock test slot constants ──────────────────────────────────────────────────

MOCK_TEST_NUMBERS: frozenset[int] = frozenset(range(1, 6))  # 1–5
"""Valid mock test slot numbers offered in the billing store."""

MOCK_TEST_SPEAKING_KEYS: frozenset[str] = frozenset(
    f"mock-test-speaking-{n}" for n in MOCK_TEST_NUMBERS
)
MOCK_TEST_WRITING_KEYS: frozenset[str] = frozenset(
    f"mock-test-writing-{n}" for n in MOCK_TEST_NUMBERS
)

# ── Module pack → task keys expansion ────────────────────────────────────────

ADDON_MODULE_TASK_KEYS: dict[str, frozenset[str]] = {
    "speaking_pack": SPEAKING_TASK_KEYS,
    "writing_pack":  WRITING_TASK_KEYS,
}
"""
Maps module-level addon types to the set of task keys they cover.
Used by the webhook handler to expand a module pack into per-task AddonCredit rows.
"""

# ── Redis pub/sub ─────────────────────────────────────────────────────────────

PLAN_CHANNEL_PREFIX: str = "celpip:plan_updates:"
"""
Redis pub/sub channel prefix.
Full channel: celpip:plan_updates:<user_uuid>

Published by: webhook handler (after db.commit)
Subscribed by: SSE handler (one subscription per open browser tab)
"""

# ── SSE connection tuning ─────────────────────────────────────────────────────

SSE_KEEPALIVE_SECONDS:    int = 25
SSE_MAX_DURATION_SECONDS: int = 3600
