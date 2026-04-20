# ─────────────────────────────────────────────────────────────────────────────
# billing/router.py — Assembles all billing route modules into one APIRouter
#
# Import order mirrors the logical flow:
#   checkout  → webhook → portal → status → events (SSE)
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.billing.routes import checkout, webhook, portal, status, events

router = APIRouter()

router.include_router(checkout.router)   # POST /billing/checkout
router.include_router(webhook.router)    # POST /billing/webhook
router.include_router(portal.router)     # GET  /billing/portal
router.include_router(status.router)     # GET  /billing/status
router.include_router(events.router)     # GET  /billing/plan-events
