# ─────────────────────────────────────────────────────────────────────────────
# billing/helpers.py — Shared DB, Stripe, and auth utility functions
#
# All functions here are pure helpers with no FastAPI route decorators.
# They are imported by the individual route modules to avoid duplication.
#
# Public API:
#   get_or_create_stripe_customer(user, db)  → str (Stripe customer ID)
#   get_active_subscription(user, db)        → Subscription | None
#   resolve_user_from_token(token, db)       → User | None
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging

import stripe

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import _get_jwks, _DEV_TOKEN_PREFIX, _check_authorized_party
from app.models.user import User
from app.models.subscription import Subscription

logger = logging.getLogger(__name__)


# ── Stripe customer ───────────────────────────────────────────────────────────


async def get_or_create_stripe_customer(user: User, db: AsyncSession) -> str:
    """
    Return the Stripe customer ID for *user*, creating one if it doesn't exist.

    Looks up the most recent Subscription row for the user.  If a
    ``stripe_customer_id`` is already stored there, it is returned immediately.
    Otherwise a new Stripe Customer object is created via the API and its ID
    is returned so the caller can attach it to the Checkout Session.

    The subscription row itself is created/updated later by
    ``_handle_checkout_completed`` in the webhook handler.
    """
    existing = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user.id)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    subscription = existing.scalar_one_or_none()

    if subscription and subscription.stripe_customer_id:
        # Patch the Stripe customer's email if it was previously stored as the
        # clerk.local fallback and we now have a real address from the JWT.
        real_email = (
            user.email
            if user.email
            and "@" in user.email
            and not user.email.endswith("@clerk.local")
            and user.email not in ("YOUR_EMAIL_HERE", "REPLACE_ME")
            else None
        )
        if real_email:
            try:
                stripe.Customer.modify(
                    subscription.stripe_customer_id,
                    email=real_email,
                    name=user.full_name or "",
                )
                logger.info(
                    "Patched Stripe customer %s email for user %s",
                    subscription.stripe_customer_id, user.id,
                )
            except stripe.StripeError:
                logger.warning(
                    "Failed to patch Stripe customer email for user %s",
                    user.id, exc_info=True,
                )
        return subscription.stripe_customer_id

    # Sanitise email before passing to Stripe — reject obvious placeholders and
    # Clerk's @clerk.local fallback so we never hit Stripe's email validation.
    raw_email = user.email or ""
    stripe_email: str | None = (
        raw_email
        if raw_email
        and "@" in raw_email
        and not raw_email.endswith("@clerk.local")
        and raw_email not in ("YOUR_EMAIL_HERE", "REPLACE_ME")
        and not raw_email.startswith("test_token_")
        else None
    )

    customer = stripe.Customer.create(
        email=stripe_email,
        name=user.full_name or "",
        metadata={"celpipbro_user_id": str(user.id)},
    )
    logger.info("Created Stripe customer %s for user %s", customer["id"], user.id)
    return customer["id"]


# ── Subscription lookup ───────────────────────────────────────────────────────


async def get_active_subscription(
    user: User, db: AsyncSession
) -> Subscription | None:
    """Return the most recent *active* Subscription for *user*, or ``None``."""
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user.id, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


# ── SSE token auth ────────────────────────────────────────────────────────────


async def resolve_user_from_token(token: str, db: AsyncSession) -> User | None:
    """
    Validate a Clerk JWT (or the dev-bypass token) and return the local User.

    Returns ``None`` on any validation failure; callers should respond with
    HTTP 401 rather than raising an exception so SSE streams close cleanly.

    Why a separate function?
    The standard ``get_current_user`` FastAPI dependency reads the token from
    the ``Authorization: Bearer`` header.  The ``EventSource`` browser API
    does not support custom request headers, so the SSE endpoint accepts the
    token as a ``?token=`` query parameter and delegates here for validation.
    """
    from app.services.user_service import get_or_create_user
    import jwt as pyjwt
    from jwt import PyJWK
    from jwt.exceptions import PyJWTError as JWTError

    try:
        # ── Development bypass ─────────────────────────────────────────────────
        # See app.core.security for the rationale: gated on ALLOW_DEV_AUTH_BYPASS
        # (config validator refuses to enable it outside APP_ENV='development').
        if settings.ALLOW_DEV_AUTH_BYPASS and token.startswith(_DEV_TOKEN_PREFIX):
            clerk_user_id = token[len(_DEV_TOKEN_PREFIX):]
            if not clerk_user_id:
                return None
            return await get_or_create_user(
                db,
                clerk_user_id,
                f"{clerk_user_id}@example.com",
                "Test User",
            )

        # ── Validate Clerk JWT ────────────────────────────────────────────────
        jwks   = await _get_jwks()
        header = pyjwt.get_unverified_header(token)
        key    = next(
            (k for k in jwks["keys"] if k["kid"] == header.get("kid")), None
        )
        if not key:
            return None

        # Mirror app.core.security.get_current_user: enforce `aud` when
        # CLERK_JWT_AUDIENCE is configured (required in production).
        decode_options: dict = {}
        decode_kwargs:  dict = {}
        if settings.CLERK_JWT_AUDIENCE:
            decode_kwargs["audience"] = settings.CLERK_JWT_AUDIENCE
        else:
            decode_options["verify_aud"] = False
        public_key = PyJWK(key).key
        payload: dict = pyjwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options=decode_options or None,
            **decode_kwargs,
        )
        _check_authorized_party(payload)
        clerk_user_id: str = payload["sub"]

        # Clerk JWT templates vary — check common claim locations in priority order.
        email: str = (
            payload.get("email")
            or payload.get("email_address")
            or ((payload.get("email_addresses") or [{}])[0].get("email_address"))
            or f"{clerk_user_id}@clerk.local"
        )
        full_name: str = payload.get("name") or payload.get("full_name") or ""
        return await get_or_create_user(db, clerk_user_id, email, full_name)

    except (JWTError, KeyError, Exception):
        logger.warning("SSE token validation failed", exc_info=True)
        return None
