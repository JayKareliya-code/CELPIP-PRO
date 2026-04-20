# ─────────────────────────────────────────────────────────────────────────────
# billing/schemas.py — Pydantic request/response models for the billing API
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    """Body sent by the frontend to initiate a Stripe Checkout Session."""
    plan: str  # "pro" | "ultra"


class CheckoutResponse(BaseModel):
    """URL returned after creating the Stripe Checkout Session."""
    checkout_url: str


class PortalResponse(BaseModel):
    """URL to the Stripe Customer Portal (receipts / invoice history)."""
    portal_url: str


class BillingStatusResponse(BaseModel):
    """Current billing state for the authenticated user."""
    plan: str
    stripe_customer_id: str | None
    has_active_purchase: bool
