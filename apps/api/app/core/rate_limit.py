"""
Rate-limiting setup for the API.

Uses ``slowapi`` (a FastAPI-friendly wrapper around flask-limiter / limits).
Key strategy:
  1. If the request carries a Clerk JWT, key by its ``sub`` claim — per-user
     limits that follow the user across token refreshes and are shared across
     API replicas (Redis-backed).
  2. Otherwise fall back to the remote address.

For durable shared state across API replicas we use Redis when configured.
"""
from __future__ import annotations

from fastapi import Request
import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Mirrors app.core.security._DEV_TOKEN_PREFIX. Redefined locally so the rate
# limiter (instantiated at import time, in the request hot path) stays free of
# the heavier security/deps/models import graph.
_DEV_TOKEN_PREFIX = "test_token_"


def _identify_client(request: Request) -> str:
    """Return a stable per-client key used by the rate limiter.

    Authenticated requests are keyed by the Clerk subject (the user id) so the
    limit follows the user across token refreshes and is shared across API
    replicas. The ``sub`` claim is read WITHOUT verifying the signature — this
    is only a bucketing key; full JWT verification happens in get_current_user.
    Unauthenticated or unparseable requests fall back to the remote address.

    The previous implementation used ``hash(raw_jwt)``, which is salted
    per-process (so buckets were not shared across workers) and changed on
    every ~60 s token refresh (so the limit reset constantly).
    """
    auth_header = request.headers.get("authorization") or ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            # Dev bypass token: test_token_<clerk_id>
            if token.startswith(_DEV_TOKEN_PREFIX):
                clerk_id = token[len(_DEV_TOKEN_PREFIX):]
                if clerk_id:
                    return f"user:{clerk_id}"
            else:
                try:
                    # PyJWT has no `get_unverified_claims`; we decode without
                    # signature verification because this is only a bucketing
                    # key — security verification happens in get_current_user.
                    claims = jwt.decode(token, options={"verify_signature": False})
                    sub = claims.get("sub")
                    if sub:
                        return f"user:{sub}"
                except Exception:
                    pass  # malformed token — fall through to IP-based keying
    return get_remote_address(request)


limiter = Limiter(
    key_func=_identify_client,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri=settings.REDIS_URL,
    headers_enabled=True,
)
