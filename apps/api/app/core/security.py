from typing import Annotated
import asyncio
import time
import httpx
from datetime import date
import jwt
from jwt import PyJWK
from jwt.exceptions import PyJWTError as JWTError
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.config import settings
from app.core.deps import get_db
from app.models.user import User
from app.services.user_service import get_or_create_user

logger = logging.getLogger(__name__)

# ── Clerk Backend API — user metadata cache ────────────────────────────────────
# Caches publicMetadata.role per clerk_user_id for 60 s to avoid hammering the
# Clerk API on every admin request while staying fresh enough for role changes.
_clerk_role_cache: dict[str, tuple[str | None, float]] = {}  # {clerk_id: (role, fetched_at)}
_CLERK_ROLE_TTL = 60.0  # seconds


class _ClerkRoleUnavailable(Exception):
    """Raised when the Clerk role lookup could not be completed.

    Signals an outage / network failure with no cached value to fall back on —
    callers MUST NOT interpret this as 'user is not an admin'.
    """


async def _get_clerk_role(clerk_user_id: str) -> str | None:
    """Fetch publicMetadata.role from Clerk Backend API with a 60-second TTL cache.

    Returns the role string, or None when Clerk definitively reports no role.
    Raises ``_ClerkRoleUnavailable`` when the lookup failed and no cached value
    is available — distinct from a confirmed "no role" so callers never revoke
    admin access during a Clerk outage.
    """
    cached = _clerk_role_cache.get(clerk_user_id)
    if cached and (time.monotonic() - cached[1]) < _CLERK_ROLE_TTL:
        return cached[0]

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"https://api.clerk.com/v1/users/{clerk_user_id}",
                headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            )
            resp.raise_for_status()
            data = resp.json()
            role: str | None = (data.get("public_metadata") or {}).get("role")
    except Exception as exc:
        logger.warning("Failed to fetch Clerk user metadata for %s", clerk_user_id, exc_info=True)
        # Fall back to a stale cached value if we have one; otherwise the role
        # is genuinely unknown — signal that so callers don't revoke admin.
        if cached:
            return cached[0]
        raise _ClerkRoleUnavailable(clerk_user_id) from exc

    _clerk_role_cache[clerk_user_id] = (role, time.monotonic())
    return role


security = HTTPBearer()

_DEV_TOKEN_PREFIX = "test_token_"

# TTL-based async JWKS cache — avoids blocking the event loop and handles key rotation
_jwks_cache: dict = {}
_jwks_fetched_at: float = 0.0
_JWKS_TTL_SECONDS: float = 3600.0  # re-fetch after 1 hour
_jwks_lock = asyncio.Lock()


async def _get_jwks() -> dict:
    """Fetch Clerk JWKS asynchronously, re-using a cached copy for up to 1 hour."""
    global _jwks_cache, _jwks_fetched_at
    if _jwks_cache and (time.monotonic() - _jwks_fetched_at) < _JWKS_TTL_SECONDS:
        return _jwks_cache
    async with _jwks_lock:
        # Re-check after acquiring lock — another coroutine may have already fetched
        if _jwks_cache and (time.monotonic() - _jwks_fetched_at) < _JWKS_TTL_SECONDS:
            return _jwks_cache
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.CLERK_JWKS_URL)
            response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_fetched_at = time.monotonic()
    return _jwks_cache


def _check_authorized_party(payload: dict) -> None:
    """Reject tokens minted for an origin this API does not serve.

    Clerk sets the ``azp`` (authorized party) claim to the frontend origin that
    requested the session token. When present, it must match one of our
    configured CORS origins — this blocks a token issued for a different app on
    the same Clerk instance from being replayed against this API.

    Tokens without ``azp`` (e.g. some custom JWT templates) are allowed through;
    the signature and expiry are still enforced by the caller's ``jwt.decode``.
    """
    azp = payload.get("azp")
    if azp and azp not in settings.CORS_ORIGINS:
        logger.warning("JWT rejected: azp %r not in allowed origins", azp)
        raise JWTError(f"Unauthorized party: {azp}")


async def get_current_user(
    request:     Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db:          Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Validate Clerk JWT and return (or lazily create) the local User row."""
    exc = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Parse the user's local date from the X-User-Date header so that streak
    # logic runs against the caller's calendar day, not the server's UTC date.
    user_date: date | None = None
    raw_date = request.headers.get("x-user-date")
    if raw_date:
        try:
            user_date = date.fromisoformat(raw_date)
        except ValueError:
            pass  # malformed header — fall back to server date gracefully

    try:
        token = credentials.credentials

        # Development-only bypass: accept test_token_<clerk_id> in local dev.
        # Gated behind ALLOW_DEV_AUTH_BYPASS (which the config validator
        # refuses to enable outside APP_ENV='development'), so a staging or
        # production deploy cannot expose this even if APP_ENV gets misset.
        if settings.ALLOW_DEV_AUTH_BYPASS and token.startswith(_DEV_TOKEN_PREFIX):
            clerk_user_id = token[len(_DEV_TOKEN_PREFIX):]
            if not clerk_user_id:
                raise exc
            return await get_or_create_user(
                db, clerk_user_id, f"{clerk_user_id}@example.com", "Test User",
                user_date=user_date,
            )

        jwks   = await _get_jwks()
        header = jwt.get_unverified_header(token)
        key    = next((k for k in jwks["keys"] if k["kid"] == header.get("kid")), None)
        if not key:
            raise exc
        # `aud` verification: when CLERK_JWT_AUDIENCE is configured we require
        # the claim to match. The prod validator forces this to be set, so
        # production deploys are always strict; in development the empty
        # default keeps the bypass for the Clerk-CLI / local test flow.
        decode_options: dict = {}
        decode_kwargs:  dict = {}
        if settings.CLERK_JWT_AUDIENCE:
            decode_kwargs["audience"] = settings.CLERK_JWT_AUDIENCE
        else:
            decode_options["verify_aud"] = False
        # PyJWK exposes `.key` as the cryptography object PyJWT.decode expects.
        public_key = PyJWK(key).key
        payload: dict = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options=decode_options or None,
            **decode_kwargs,
        )
        _check_authorized_party(payload)
        clerk_user_id: str = payload["sub"]

        # Clerk JWT templates vary — try common claim locations in order.
        email: str = (
            payload.get("email")
            or payload.get("email_address")
            # Some Clerk templates nest it: email_addresses[0].email_address
            or (
                (payload.get("email_addresses") or [{}])[0].get("email_address")
            )
            # Fallback — ensures the NOT NULL column is always populated.
            or f"{clerk_user_id}@clerk.local"
        )
        full_name: str = payload.get("name") or payload.get("full_name") or ""
    except (JWTError, KeyError):
        logger.warning("JWT validation failed", exc_info=True)
        raise exc

    return await get_or_create_user(db, clerk_user_id, email, full_name, user_date=user_date)


async def require_admin(
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Dependency that raises 403 for non-admin users.

    Authority order (first match wins):
      1. Clerk publicMetadata.role == "admin"  (live, fetched via Backend API, 60-s cache)
      2. Local DB user.is_admin == True         (fallback / dev-token path)

    When Clerk grants admin, the DB flag is synced automatically so that
    subsequent queries and audit logs see the correct value without an
    extra round-trip.
    """
    # ── 1. Check Clerk Backend API for the live role ───────────────────────────
    try:
        clerk_role = await _get_clerk_role(user.clerk_user_id)
        is_clerk_admin = clerk_role == "admin"
        clerk_known = True
    except _ClerkRoleUnavailable:
        # Clerk is unreachable and we have no cached role. Fall back to the
        # last-known DB flag WITHOUT mutating it — treating an outage as
        # "role revoked" would strip admin from everyone and persist it.
        logger.warning(
            "Clerk role lookup unavailable for %s — falling back to DB is_admin=%s",
            user.clerk_user_id, user.is_admin,
        )
        is_clerk_admin = False
        clerk_known = False

    # ── 2. Sync DB flag — ONLY when Clerk gave a definitive answer ─────────────
    if clerk_known:
        if is_clerk_admin and not user.is_admin:
            user.is_admin = True
            await db.flush()
            logger.info("Synced is_admin=True from Clerk for user %s", user.clerk_user_id)
        elif not is_clerk_admin and user.is_admin:
            # Clerk role was revoked — honour that immediately
            user.is_admin = False
            await db.flush()
            logger.info("Synced is_admin=False from Clerk for user %s", user.clerk_user_id)

    # ── 3. Gate ────────────────────────────────────────────────────────────────
    # During a Clerk outage (clerk_known=False) this falls back to the
    # last-synced DB flag so existing admins keep working.
    if not (is_clerk_admin or user.is_admin):
        raise HTTPException(status_code=403, detail="Admin only")

    return user


# Freshness window: how recent the JWT `iat` claim must be to count as a
# fresh authentication. Clerk session tokens refresh every ~60s, so a 5-minute
# window means the user (or a stolen token) cannot trigger destructive actions
# more than 5 minutes after the last refresh.
_RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60


async def require_recent_auth(
    request:     Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    user:        Annotated[User, Depends(get_current_user)],
) -> User:
    """Validate the caller and additionally require a *recently minted* JWT.

    Use this dependency on endpoints whose effect is destructive or
    high-trust (account deletion, payment-method removal, etc.). It rejects
    callers whose token's `iat` claim is older than 5 minutes, which forces
    the frontend to call ``getToken({ skipCache: true })`` immediately before
    the request — proof that the user is actively in the session, not just
    that a stale token leaked from logs or browser storage.

    The development bypass token (``test_token_*``) is exempt so local
    integration tests don't have to forge JWT claims.
    """
    token = credentials.credentials

    if settings.ALLOW_DEV_AUTH_BYPASS and token.startswith(_DEV_TOKEN_PREFIX):
        return user

    try:
        # PyJWT has no `get_unverified_claims` helper. We re-decode the token
        # without signature verification: this is safe here because the
        # signature WAS already verified by get_current_user above (caller is
        # authenticated), and we only need the `iat` claim for freshness.
        claims = jwt.decode(token, options={"verify_signature": False})
        iat    = int(claims.get("iat", 0))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Could not parse token claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if iat <= 0 or (time.time() - iat) > _RECENT_AUTH_MAX_AGE_SECONDS:
        logger.warning(
            "require_recent_auth: stale token rejected user=%s iat=%s age=%.0fs",
            user.clerk_user_id, iat, time.time() - iat if iat else -1,
        )
        raise HTTPException(
            status_code=401,
            detail={
                "code": "STALE_AUTH",
                "message": (
                    "This action requires a freshly authenticated session. "
                    "Please re-authenticate and try again."
                ),
            },
        )

    return user
