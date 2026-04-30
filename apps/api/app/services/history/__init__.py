"""
history — History service package.

Public API
----------
  get_practice_history(db, user_id, skill, page, limit)
      → PaginatedHistory

  get_mock_exam_history(db, user_id, page, limit)
      → PaginatedMockExamHistory

  get_recent_task_scores(db, user_id, skill, task_number, limit)
      → TaskScoreHistory

Internal modules (extend these to add new skills / data sources):
  _helpers.py      — shared helpers (build_task_title)
  practice.py      — practice attempt history
  mock_speaking.py — speaking mock session builder
  mock_writing.py  — writing mock session builder
  mock_combined.py — merges all mock session sources + paginates
"""
from .practice     import get_practice_history, get_recent_task_scores
from .mock_combined import get_mock_exam_history

__all__ = [
    "get_practice_history",
    "get_mock_exam_history",
    "get_recent_task_scores",
]
