"""
Speaking mock exam session history.

Speaking mock sessions are stored in `mock_exam_task_attempts` (one row per task,
grouped by session_id UUID). This module fetches all sessions for a user and
returns them as MockExamSession objects ready to be merged with writing sessions.
"""
from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.history import MockExamSession, MockExamTaskResult

logger = logging.getLogger(__name__)


async def get_speaking_mock_sessions(
    db: AsyncSession,
    user_id: UUID,
) -> list[MockExamSession]:
    """Fetch ALL speaking mock exam sessions for a user (un-paginated).

    Returns a list of MockExamSession objects sorted newest-first.
    The caller (mock_combined) merges these with writing sessions and
    applies pagination.
    """
    # ── 1. All distinct sessions ordered newest-first ─────────────────────────
    session_rows = (
        await db.execute(
            text(
                "SELECT session_id, MIN(created_at) AS session_created "
                "FROM mock_exam_task_attempts "
                "WHERE user_id = :uid "
                "GROUP BY session_id "
                "ORDER BY session_created DESC"
            ),
            {"uid": user_id},
        )
    ).mappings().all()

    if not session_rows:
        return []

    session_ids   = [r["session_id"] for r in session_rows]
    session_dates = {r["session_id"]: r["session_created"] for r in session_rows}

    # ── 2. All task rows for these sessions ───────────────────────────────────
    task_rows = (
        await db.execute(
            text(
                "SELECT session_id, task_number, status, estimated_band "
                "FROM mock_exam_task_attempts "
                "WHERE session_id = ANY(:sids) AND user_id = :uid "
                "ORDER BY session_id, task_number"
            ),
            {"sids": session_ids, "uid": user_id},
        )
    ).mappings().all()

    # Group tasks by session
    tasks_by_session: dict[str, list] = {sid: [] for sid in session_ids}
    for row in task_rows:
        tasks_by_session[row["session_id"]].append(row)

    # ── 3. Assemble sessions ──────────────────────────────────────────────────
    sessions: list[MockExamSession] = []
    for sid in session_ids:
        task_list = tasks_by_session.get(sid, [])
        task_results = [
            MockExamTaskResult(
                task_number=t["task_number"],
                status=t["status"],
                estimated_band=(
                    int(round(t["estimated_band"])) if t["estimated_band"] is not None else None
                ),
            )
            for t in task_list
        ]
        scored_bands = [
            t.estimated_band
            for t in task_results
            if t.estimated_band is not None and t.status == "complete"
        ]
        avg_band = round(sum(scored_bands) / len(scored_bands), 1) if scored_bands else None

        sessions.append(
            MockExamSession(
                session_id=sid,
                skill="speaking",
                tasks=task_results,
                avg_band=avg_band,
                tasks_complete=sum(1 for t in task_results if t.status == "complete"),
                tasks_total=len(task_results),
                created_at=session_dates[sid],
            )
        )

    logger.debug("Speaking mock sessions: user=%s count=%d", user_id, len(sessions))
    return sessions
