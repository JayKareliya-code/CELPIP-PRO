# ─────────────────────────────────────────────────────────────────────────────
# billing/constants.py — All billing-related constants
#
# Single source of truth for:
#   - Stripe plan → price ID mapping
#   - Redis pub/sub channel prefix (used by webhook publisher + SSE subscriber)
#   - SSE connection tuning parameters
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import stripe

from app.core.config import settings

# ── Stripe ────────────────────────────────────────────────────────────────────

# Initialise the Stripe SDK once, at module import time.
stripe.api_key = settings.STRIPE_SECRET_KEY

PLAN_PRICE_IDS: dict[str, str] = {
    "pro":   settings.STRIPE_PRO_PRICE_ID,
    "ultra": settings.STRIPE_ULTRA_PRICE_ID,
}
"""Maps plan slug → Stripe Price ID (one-time payment prices)."""

# ── Redis pub/sub ─────────────────────────────────────────────────────────────

PLAN_CHANNEL_PREFIX: str = "celpip:plan_updates:"
"""
Redis pub/sub channel prefix.
Full channel name: celpip:plan_updates:<user_uuid>

Published by: webhook handler (after db.commit)
Subscribed by: SSE handler (one subscription per open browser tab)
"""

# ── SSE connection tuning ─────────────────────────────────────────────────────

SSE_KEEPALIVE_SECONDS: int = 25
"""
Interval (seconds) between SSE keepalive comment frames (`: ping`).
Must be shorter than any intermediate proxy's idle-connection timeout.
Nginx default read_timeout is 60 s; most ALBs use 60 s as well.
"""

SSE_MAX_DURATION_SECONDS: int = 3600
"""
Maximum lifetime of a single SSE connection (1 hour).
After this the generator exits and the browser's EventSource reconnects
automatically using its built-in 3 s backoff.
"""
