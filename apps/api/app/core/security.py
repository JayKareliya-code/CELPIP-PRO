from typing import Annotated
import asyncio
import time
import httpx
from datetime import date
from jose import jwt, jwk, JWTError
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


async def _get_clerk_role(clerk_user_id: str) -> str | None:
    """Fetch publicMetadata.role from Clerk Backend API with a 60-second TTL cache."""
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
    except Exception:
        logger.warning("Failed to fetch Clerk user metadata for %s", clerk_user_id, exc_info=True)
        # On failure, fall back to whatever is cached (even stale), or None
        return cached[0] if cached else None

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
        # Gated behind APP_ENV so this can never run in production.
        if settings.APP_ENV == "development" and token.startswith(_DEV_TOKEN_PREFIX):
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
        payload: dict = jwt.decode(
            token,
            jwk.construct(key),
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
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
    clerk_role = await _get_clerk_role(user.clerk_user_id)
    is_clerk_admin = clerk_role == "admin"

    # ── 2. Sync DB flag if it drifted from Clerk truth ─────────────────────────
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
    if not (is_clerk_admin or user.is_admin):
        raise HTTPException(status_code=403, detail="Admin only")

    return user
