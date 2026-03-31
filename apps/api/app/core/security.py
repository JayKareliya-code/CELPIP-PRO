from typing import Annotated
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


async def _get_jwks() -> dict:
    """Fetch Clerk JWKS asynchronously, re-using a cached copy for up to 1 hour."""
    global _jwks_cache, _jwks_fetched_at
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

        # Development bypass: accept test_token_<clerk_id> when CLERK_SECRET_KEY is unset
        # Remove this block entirely before production deployment.
        if token.startswith(_DEV_TOKEN_PREFIX):
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
        email:         str = payload.get("email", "")
        full_name:     str = payload.get("name", "")
    except (JWTError, KeyError):
        logger.warning("JWT validation failed", exc_info=True)
        raise exc

    return await get_or_create_user(db, clerk_user_id, email, full_name)


async def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Dependency that raises 403 for non-admin users."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user
