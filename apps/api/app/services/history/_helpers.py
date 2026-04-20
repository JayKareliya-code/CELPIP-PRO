"""
Shared helpers for the history service package.
"""
from __future__ import annotations


def build_task_title(skill: str, task_number: int, prompt_title: str | None) -> str:
    """Return a human-readable task title for a history row.

    - Writing: always prefixed "Writing Task N — <prompt title>" so the task
      number is immediately visible in the history table.
    - Speaking: uses the prompt's own descriptive title directly.
    - Fallback: "Speaking/Writing Task N" when no prompt title is found.
    """
    if skill == "writing":
        prefix = f"Writing Task {task_number}"
        return f"{prefix} — {prompt_title}" if prompt_title else prefix
    return prompt_title or f"Speaking Task {task_number}"
