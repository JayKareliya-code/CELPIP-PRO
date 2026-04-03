"""Shared helpers for admin API routes."""
from typing import Any


def to_dict(obj: Any) -> dict[str, Any]:
    """Convert a SQLAlchemy model instance to a JSON-serialisable dict.

    Strips the internal `_sa_instance_state` key that SQLAlchemy injects into
    `__dict__` so FastAPI can serialise the response without error.
    """
    return {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
