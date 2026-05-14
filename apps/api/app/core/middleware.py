"""
middleware.py — Production-grade ASGI middleware for the CELPIP API.

Middleware registered here:
  • RequestIDMiddleware — Generates/propagates X-Request-ID per request.
    Injects the ID into the structlog context so every log line for a
    request is correlated.  The header is echoed back in responses so
    clients and load balancers can trace requests end-to-end.
"""
from __future__ import annotations

import re
import uuid
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging_config import request_id_ctx

logger = logging.getLogger(__name__)

# ── Request-ID Middleware ─────────────────────────────────────────────────────

REQUEST_ID_HEADER = "X-Request-ID"

# A propagated request id must be a short, printable token. Anything outside
# this charset (control characters, newlines, oversized values) is rejected so
# a client cannot forge log lines or inject into the response header.
_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,128}$")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Assign a UUID to every request and thread it through logs and responses.

    Behaviour:
    - If the incoming request carries a well-formed ``X-Request-ID``, that
      value is reused (allows ALB / nginx to propagate the ID from upstream).
    - If the header is missing OR fails validation, a new UUID4 is generated.
    - The ID is stored in a ``ContextVar`` so structlog processors can include
      it in every log line produced during the request lifecycle.
    - The ID is returned in the response ``X-Request-ID`` header so clients
      can include it in bug reports.
    """

    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: ANN001
        incoming = request.headers.get(REQUEST_ID_HEADER)
        if incoming and _REQUEST_ID_RE.match(incoming):
            request_id = incoming
        else:
            request_id = str(uuid.uuid4())
        token = request_id_ctx.set(request_id)
        try:
            response: Response = await call_next(request)
            response.headers[REQUEST_ID_HEADER] = request_id
            return response
        finally:
            request_id_ctx.reset(token)
