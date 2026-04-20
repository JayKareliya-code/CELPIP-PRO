# ─────────────────────────────────────────────────────────────────────────────
# billing/__init__.py — Public surface of the billing package
#
# Exports `router` so that the existing app-level import stays identical:
#
#   # app/api/router.py  (unchanged)
#   from app.api.v1 import billing
#   api_router.include_router(billing.router, prefix="", tags=["Billing"])
#
# Package layout
# ──────────────
# billing/
# ├── __init__.py      ← you are here (re-exports `router`)
# ├── constants.py     ← Stripe init, plan→price map, Redis prefix, SSE tuning
# ├── schemas.py       ← Pydantic request/response models
# ├── helpers.py       ← shared DB, Stripe, and auth utility functions
# ├── router.py        ← assembles all sub-routers into one APIRouter
# └── routes/
#     ├── __init__.py
#     ├── checkout.py  ← POST /billing/checkout
#     ├── webhook.py   ← POST /billing/webhook  (+_handle_checkout_completed)
#     ├── portal.py    ← GET  /billing/portal
#     ├── status.py    ← GET  /billing/status
#     └── events.py    ← GET  /billing/plan-events  (SSE stream)
# ─────────────────────────────────────────────────────────────────────────────

from app.api.v1.billing.router import router

__all__ = ["router"]
