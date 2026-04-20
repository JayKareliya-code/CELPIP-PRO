"""
history_service — backward-compatible shim.

This module re-exports from the modular `history/` package so that any
existing code that imports `from app.services.history_service import ...`
continues to work unchanged.

New code should import from the package directly:
    from app.services.history import get_practice_history, get_mock_exam_history
"""
from app.services.history import get_practice_history, get_mock_exam_history

# Legacy names used by the history API endpoint
get_user_history = get_practice_history

__all__ = [
    "get_user_history",
    "get_practice_history",
    "get_mock_exam_history",
]
