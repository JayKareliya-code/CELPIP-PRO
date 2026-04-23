# ─────────────────────────────────────────────────────────────────────────────
# billing/routes/sse_token.py — POST /billing/sse-token
#
# Mints a short-lived (60 s) opaque token that the SSE endpoint accepts
# instead of the full Clerk JWT in the query string.
#
# Security rationale:
#   EventSource does not support custom request headers, so the only way to
#   authenticate an SSE stream is via the query string.  Passing a full JWT
#   in the URL means it gets recorded in every access log between the browser
#   and the server (nginx, ALB, CloudWatch, etc.).
#
#   This endpoint solves that by:
#     1. Accepting the Clerk JWT via the standard Authorization header (never logged).
#     2. Minting a random 32-byte opaque token stored in Redis with a 60 s TTL.
#     3. Returning ONLY the opaque token to the client.
#
#   The SSE endpoint (/billing/plan-events) then looks up the opaque token in
#   Redis to resolve the user — the JWT never appears in any URL.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import secrets
import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_redis_pool
from app.core.security import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# Token TTL — long enough for the client to open EventSource, short enough
# to limit exposure if somehow leaked from memory.
SSE_TOKEN_TTL_SECONDS = 90
SSE_TOKEN_PREFIX = "sse_token:"


class SSETokenResponse(BaseModel):
    token: str
    expires_in: int = SSE_TOKEN_TTL_SECONDS


@router.post("/billing/sse-token", response_model=SSETokenResponse)
async def mint_sse_token(
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],   # noqa: ARG001 — triggers auth middleware
) -> SSETokenResponse:
    """Mint a short-lived opaque SSE authentication token.

    The client calls this endpoint (with a standard Bearer token in the
    Authorization header), then opens EventSource with the returned opaque
    token in the URL.  This keeps the full Clerk JWT out of access logs.

    The token is a 32-byte cryptographically random hex string stored as::

        Redis key:   sse_token:{token_hex}
        Redis value: {user_id_str}
        TTL:         SSE_TOKEN_TTL_SECONDS (90 s)
    """
    token = secrets.token_hex(32)
    redis = get_redis_pool()
    await redis.set(
        f"{SSE_TOKEN_PREFIX}{token}",
        str(user.id),
        ex=SSE_TOKEN_TTL_SECONDS,
    )
    logger.debug("SSE token minted for user=%s (ttl=%ds)", user.id, SSE_TOKEN_TTL_SECONDS)
    return SSETokenResponse(token=token)
