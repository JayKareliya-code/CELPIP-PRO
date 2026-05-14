from __future__ import annotations

from pydantic import BaseModel, Field


# ── Checkout ──────────────────────────────────────────────────────────────────

class CartItemRequest(BaseModel):
    """A single line item in a cart checkout request."""
    id:       str               = Field(description="Client-side item ID (e.g. 'speaking-pack')")
    type:     str               = Field(description="'plan' | 'writing_pack' | 'speaking_pack' | 'custom_bundle'")
    quantity: int               = Field(ge=1, le=50, description="Per-line quantity, 1–50")
    metadata: dict[str, str]   = Field(default_factory=dict, description="task_key for custom_bundle; ignored otherwise")


class CartCheckoutRequest(BaseModel):
    """Cart payload sent by the frontend to initiate a Stripe Checkout Session."""
    items:      list[CartItemRequest] = Field(min_length=1)
    promo_code: str | None            = Field(default=None)


class CheckoutResponse(BaseModel):
    """Stripe Checkout URL returned after session creation."""
    checkout_url: str


# ── Promo ─────────────────────────────────────────────────────────────────────

class PromoValidateRequest(BaseModel):
    """Body sent to validate a promo code before checkout."""
    code: str = Field(min_length=1, max_length=64)


class PromoValidateResponse(BaseModel):
    """Promo code validation result.

    On success, ``percent_off`` is an integer 0–100 (e.g. 20 → "20% off").
    The frontend is responsible for computing the dollar discount against the
    live cart subtotal.  The code is re-validated by Stripe at checkout time;
    this endpoint is for UX preflight only.
    """
    valid:       bool
    code:        str
    percent_off: int | None = None
    message:     str | None = None


# ── Portal / Status ───────────────────────────────────────────────────────────

class PortalResponse(BaseModel):
    """Stripe Customer Portal URL."""
    portal_url: str


class BillingStatusResponse(BaseModel):
    """Current billing state for the authenticated user."""
    plan:               str
    stripe_customer_id: str | None
    has_active_purchase: bool


# ── Addon Credit Summary ──────────────────────────────────────────────────────

class TaskCreditStat(BaseModel):
    """Credit balance for a single task."""
    available: int = Field(ge=0, description="Remaining unconsumed credits for this task.")
    purchased: int = Field(ge=0, description="Total credits ever purchased for this task (excluding refunds).")


class MockCreditStat(BaseModel):
    """Aggregate mock test credit balance (not task-specific)."""
    available: int = Field(ge=0, description="Remaining mock test credits.")
    purchased: int = Field(ge=0, description="Total mock credits ever purchased.")


class AddonCreditSummaryResponse(BaseModel):
    """Per-skill, per-task addon credit inventory plus mock bundle balances.

    Returned by GET /billing/addon-credits.

    Keys are task_number integers; missing tasks have no credits.
    Both active AND exhausted rows are included so the UI can render
    progress bars even for fully-consumed packs.

    Example::

        {
          "speaking": {"1": {"available": 4, "purchased": 5}},
          "writing":  {"1": {"available": 5, "purchased": 5},
                       "2": {"available": 0, "purchased": 5}},
          "mock":     {"speaking": {"available": 2, "purchased": 2},
                       "writing":  {"available": 1, "purchased": 2}}
        }
    """
    speaking: dict[int, TaskCreditStat] = Field(default_factory=dict)
    writing:  dict[int, TaskCreditStat] = Field(default_factory=dict)
    mock:     dict[str, MockCreditStat] = Field(default_factory=dict)

