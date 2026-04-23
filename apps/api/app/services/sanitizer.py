"""HTML/markdown sanitization for admin-authored content.

Admin endpoints accept free-form text fields (prompt_text, body_markdown, etc.)
that may be rendered to other users. This module strips dangerous tags and
attributes before persistence to prevent stored-XSS.

Use ``sanitize_rich_text`` for rich-text/markdown bodies that allow some
formatting; use ``sanitize_plain_text`` for fields that should never contain
markup (titles, slugs, summaries).
"""
from __future__ import annotations

import bleach

ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote",
    "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "hr",
]

ALLOWED_ATTRS = {
    "a": ["href", "title", "rel"],
}

ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def sanitize_rich_text(value: str | None) -> str | None:
    """Strip dangerous HTML, keep a small allowlist of formatting tags."""
    if value is None:
        return None
    return bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )


def sanitize_plain_text(value: str | None) -> str | None:
    """Strip ALL HTML — use for titles, summaries, anything not meant to render markup."""
    if value is None:
        return None
    return bleach.clean(value, tags=[], attributes={}, strip=True)


def sanitize_dict(data: dict, *, rich_keys: set[str], plain_keys: set[str] = frozenset()) -> dict:
    """Mutate ``data`` in-place: sanitize string values for the named keys.

    Non-string values (None, lists, ints) pass through untouched.
    """
    for key in rich_keys:
        if key in data and isinstance(data[key], str):
            data[key] = sanitize_rich_text(data[key])
    for key in plain_keys:
        if key in data and isinstance(data[key], str):
            data[key] = sanitize_plain_text(data[key])
    return data
