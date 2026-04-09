from typing import Annotated
import asyncio
import time
import httpx
from jose import jwt, jwk, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.config import settings
from app.core.deps import get_db
from app.models.user import User
from app.services.user_service import get_or_create_user

logger = logging.getLogger(__name__)
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
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db:          Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Validate Clerk JWT and return (or lazily create) the local User row."""
    exc = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials

        # Development-only bypass: accept test_token_<clerk_id> in local dev.
        # Gated behind APP_ENV so this can never run in production.
        if settings.APP_ENV == "development" and token.startswith(_DEV_TOKEN_PREFIX):
            clerk_user_id = token[len(_DEV_TOKEN_PREFIX):]
            if not clerk_user_id:
                raise exc
            return await get_or_create_user(
                db, clerk_user_id, f"{clerk_user_id}@example.com", "Test User"
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

    return await get_or_create_user(db, clerk_user_id, email, full_name)


async def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Dependency that raises 403 for non-admin users."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user
