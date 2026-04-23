"""
Feature Flags — lightweight abstraction over two backends:

  Backend A: self-hosted Unleash (``UnleashClient>=5.2.0``)
    Activate by setting UNLEASH_URL + UNLEASH_TOKEN in the environment.
    The ``UnleashClient`` package is an optional dep — the module loads
    without it; only a warning is logged if the URL is set but the package
    is missing.

  Backend B: env-var JSON (default, zero deps)
    Set ``FEATURE_FLAGS_JSON='{"new_essay_prompt": true}'`` in the environment.
    The JSON is parsed once at first call and cached for the process lifetime.

Priority: Unleash (if configured and importable) > FEATURE_FLAGS_JSON > False.

Usage::

    from app.core.feature_flags import is_enabled, KNOWN_FLAGS

    # In a FastAPI route handler:
    if is_enabled("new_essay_prompt", context={"user_id": str(user.id), "plan": user.plan}):
        ...

    # The GET /feature-flags endpoint evaluates all KNOWN_FLAGS for the caller.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)
_stdlib_log = logging.getLogger(__name__)

# ── Known flags ───────────────────────────────────────────────────────────────
# Add new flag names here as they are introduced.  The GET /feature-flags
# endpoint evaluates all KNOWN_FLAGS and returns them to the client so the
# frontend can gate features without knowing which flags exist.
KNOWN_FLAGS: list[str] = [
    "new_essay_prompt",   # Test alternative essay prompt styles
    "mock_exam_v2",       # Updated mock exam UI flow
    "cost_report_enabled",  # Admin cost report tab (always true for admins via API guard)
    "speaking_tips_v2",   # Revised speaking tip overlays
]

# ── Module-level state ────────────────────────────────────────────────────────

_unleash_client: Any = None          # UnleashClient instance or None
_unleash_tried: bool = False         # Did we already attempt to init Unleash?
_json_flags: dict[str, bool] | None = None  # Parsed FEATURE_FLAGS_JSON cache


# ── Unleash init ──────────────────────────────────────────────────────────────

def _get_unleash_client() -> Any:
    """Lazily initialise and return the Unleash client singleton, or None."""
    global _unleash_client, _unleash_tried
    if _unleash_tried:
        return _unleash_client

    _unleash_tried = True

    if not settings.UNLEASH_URL:
        return None

    try:
        from UnleashClient import UnleashClient  # type: ignore[import]
    except ImportError:
        _stdlib_log.warning(
            "UNLEASH_URL is set but 'UnleashClient' is not installed. "
            "Falling back to FEATURE_FLAGS_JSON. "
            "Install it with: pip install 'UnleashClient>=5.2.0'"
        )
        return None

    try:
        client = UnleashClient(
            url=settings.UNLEASH_URL,
            app_name="celpip-api",
            custom_headers={"Authorization": settings.UNLEASH_TOKEN}
            if settings.UNLEASH_TOKEN
            else {},
        )
        client.initialize_client()
        _unleash_client = client
        logger.info("feature_flags.unleash_initialized", url=settings.UNLEASH_URL)
    except Exception as exc:
        logger.warning("feature_flags.unleash_init_failed", error=str(exc))

    return _unleash_client


# ── JSON flags ────────────────────────────────────────────────────────────────

def _get_json_flags() -> dict[str, bool]:
    """Parse FEATURE_FLAGS_JSON once and cache the result."""
    global _json_flags
    if _json_flags is not None:
        return _json_flags

    raw = settings.FEATURE_FLAGS_JSON
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            raise TypeError("FEATURE_FLAGS_JSON must be a JSON object (dict)")
        _json_flags = {str(k): bool(v) for k, v in parsed.items()}
    except Exception as exc:
        _stdlib_log.warning("FEATURE_FLAGS_JSON parse error (%s) — treating all flags as False", exc)
        _json_flags = {}

    return _json_flags


# ── Public API ────────────────────────────────────────────────────────────────

def is_enabled(flag: str, context: dict[str, str] | None = None) -> bool:
    """
    Return True if ``flag`` is enabled for the given optional context.

    Falls back through: Unleash → FEATURE_FLAGS_JSON → False.
    Never raises; any error returns False (safe / closed by default).
    """
    try:
        client = _get_unleash_client()
        if client is not None:
            ctx = context or {}
            return bool(client.is_enabled(flag, ctx))

        # Env-var fallback
        return _get_json_flags().get(flag, False)

    except Exception as exc:
        logger.warning("feature_flags.is_enabled_error", flag=flag, error=str(exc))
        return False


def evaluate_all(context: dict[str, str] | None = None) -> dict[str, bool]:
    """Evaluate all KNOWN_FLAGS and return a flat dict of flag → bool."""
    return {flag: is_enabled(flag, context) for flag in KNOWN_FLAGS}
