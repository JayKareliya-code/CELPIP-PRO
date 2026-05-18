"""
middleware.py — Production-grade ASGI middleware for the CELPIP API.

Middleware registered here:
  • RequestIDMiddleware  — Generates/propagates X-Request-ID per request.
    Injects the ID into the structlog context so every log line for a
    request is correlated. The header is echoed back in responses so
    clients and load balancers can trace requests end-to-end.
  • SecurityHeadersMiddleware — Adds HSTS / X-Content-Type-Options /
    X-Frame-Options / Referrer-Policy on every response.
  • BodySizeLimitMiddleware  — Rejects requests with Content-Length above
    a configured cap before route handlers see them; protects FastAPI from
    memory-exhausting payloads on endpoints whose route logic does its own
    (post-buffer) size check.
"""
from __future__ import annotations

import re
import uuid
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

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


# ── Security-Headers Middleware ───────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach a small, conservative set of security response headers.

    These headers are cheap to send, cause no functional changes, and harden
    several common attack classes:

      Strict-Transport-Security  — Lock the browser to HTTPS for this host
                                   for two years. Only sent in non-development
                                   so local http:// dev still works.
      X-Content-Type-Options     — Disable MIME-sniffing on responses.
      X-Frame-Options            — Block this API from being framed (the
                                   /docs swagger page is the only HTML
                                   surface and never needs to be embedded).
      Referrer-Policy            — Strip the path/query when navigating to
                                   external origins.

    We intentionally do NOT send a Content-Security-Policy here — this API
    serves JSON, and CSP gets in the way of the /docs swagger HTML during
    development. CSP belongs on the frontend's Next.js layer.
    """

    def __init__(self, app, *, hsts: bool = True) -> None:  # noqa: ANN001
        super().__init__(app)
        self._hsts = hsts

    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: ANN001
        response: Response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options",        "DENY")
        response.headers.setdefault("Referrer-Policy",        "strict-origin-when-cross-origin")
        if self._hsts:
            # 2 years, include subdomains, preload-eligible.
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=63072000; includeSubDomains; preload",
            )
        return response


# ── Body-Size-Limit Middleware ────────────────────────────────────────────────

class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests with Content-Length above `max_bytes` before reading.

    Starlette will happily buffer the entire request body into memory before
    your route handler runs. Audio uploads cap themselves at AUDIO_MAX_BYTES
    inside the route, but by then the bytes are already in memory. This
    middleware enforces a hard ceiling at the front door.

    Requests without a Content-Length header (chunked transfer encoding) are
    forwarded unchecked; the per-route validators (essay length, audio size)
    remain the second line of defense for them.
    """

    def __init__(self, app, *, max_bytes: int) -> None:  # noqa: ANN001
        super().__init__(app)
        if max_bytes <= 0:
            raise ValueError("BodySizeLimitMiddleware: max_bytes must be > 0")
        self._max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: ANN001
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                size = int(cl)
            except ValueError:
                return JSONResponse(
                    {"detail": "Invalid Content-Length header."},
                    status_code=400,
                )
            if size > self._max_bytes:
                logger.warning(
                    "Body-size limit hit: %d bytes (> %d) path=%s",
                    size, self._max_bytes, request.url.path,
                )
                return JSONResponse(
                    {"detail": f"Request body exceeds {self._max_bytes} bytes."},
                    status_code=413,
                )
        return await call_next(request)
