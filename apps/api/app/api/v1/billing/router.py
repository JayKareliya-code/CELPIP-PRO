from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.billing.routes import checkout, webhook, portal, status, sse_token, events, promo, credits

router = APIRouter()

router.include_router(checkout.router)   # POST /billing/checkout
router.include_router(webhook.router)    # POST /billing/webhook
router.include_router(portal.router)     # GET  /billing/portal
router.include_router(status.router)     # GET  /billing/status
router.include_router(sse_token.router)  # POST /billing/sse-token
router.include_router(events.router)     # GET  /billing/plan-events
router.include_router(promo.router)      # POST /billing/promo/validate
router.include_router(credits.router)   # GET  /billing/addon-credits

