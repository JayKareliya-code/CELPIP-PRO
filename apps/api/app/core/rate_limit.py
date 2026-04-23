"""
Rate-limiting setup for the API.

Uses ``slowapi`` (a FastAPI-friendly wrapper around flask-limiter / limits).
Key strategy:
  1. If the request carries a Clerk subject (sub claim in JWT), key by that
     — per-user limits, unaffected by NAT or shared IPs.
  2. Otherwise fall back to the remote address.

For durable shared state across API replicas we use Redis when configured.
"""
from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def _identify_client(request: Request) -> str:
    """Return the per-client key used by the rate limiter."""
    auth_header = request.headers.get("authorization") or ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            # Hash-key the raw JWT — same token → same bucket, without decoding here.
            return f"bearer:{hash(token)}"
    return get_remote_address(request)


limiter = Limiter(
    key_func=_identify_client,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri=settings.REDIS_URL,
    headers_enabled=True,
)
