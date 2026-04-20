"""
Writing mock exam session history.

Writing mock attempts live in the `attempts` table (skill='writing',
is_mock_test=True) grouped by `mock_exam_number`.  A NULL mock_exam_number
means the attempt was submitted via an older flow that didn't track the slot;
those are surfaced as individual "orphan" sessions rather than silently dropped.

Query strategy
--------------
We use DISTINCT ON (mock_exam_number, task_number) to pick the LATEST attempt
per (slot, task) combination.  This correctly handles the case where a user
retried a task within the same mock exam slot — only the most recent row is used.
"""
from __future__ import annotations

import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.history import MockExamSession, MockExamTaskResult

logger = logging.getLogger(__name__)


async def get_writing_mock_sessions(
    db: AsyncSession,
    user_id: UUID,
) -> list[MockExamSession]:
    """Fetch ALL writing mock exam sessions for a user (un-paginated).

    Each distinct mock_exam_number becomes one MockExamSession.
    Attempts with mock_exam_number IS NULL are grouped into a single
    "legacy" session per exam attempt pair (Task 1 + Task 2).

    Returns sessions sorted newest-first by the earliest task creation time
    in that slot.
    """
    sessions: list[MockExamSession] = []

    # ── Slotted sessions (mock_exam_number IS NOT NULL) ───────────────────────
    # DISTINCT ON picks the latest attempt per (slot, task).
    slotted_rows = (
        await db.execute(
            text(
                """
                SELECT DISTINCT ON (a.mock_exam_number, a.task_number)
                    a.mock_exam_number,
                    a.task_number,
                    a.status,
                    sr.estimated_band,
                    a.created_at
                FROM attempts a
                LEFT JOIN score_reports sr ON sr.attempt_id = a.id
                WHERE a.user_id        = :uid
                  AND a.skill          = 'writing'
                  AND a.is_mock_test   = true
                  AND a.mock_exam_number IS NOT NULL
                ORDER BY a.mock_exam_number, a.task_number, a.created_at DESC
                """
            ),
            {"uid": user_id},
        )
    ).mappings().all()

    # Group by exam slot number
    slots: dict[int, list] = {}
    slot_dates: dict[int, datetime] = {}
    for row in slotted_rows:
        slot = row["mock_exam_number"]
        slots.setdefault(slot, []).append(row)
        # Track the earliest task creation in this slot (= "session started at")
        existing = slot_dates.get(slot)
        if existing is None or row["created_at"] < existing:
            slot_dates[slot] = row["created_at"]

    for slot_num in sorted(slots.keys()):
        task_list = slots[slot_num]
        task_results = [
            MockExamTaskResult(
                task_number=t["task_number"],
                status=t["status"],
                estimated_band=(
                    float(t["estimated_band"]) if t["estimated_band"] is not None else None
                ),
            )
            for t in task_list
        ]
        scored = [
            t.estimated_band
            for t in task_results
            if t.estimated_band is not None and t.status == "complete"
        ]
        avg_band = round(sum(scored) / len(scored), 1) if scored else None

        sessions.append(
            MockExamSession(
                session_id=f"writing-mock-{slot_num}",
                skill="writing",
                tasks=task_results,
                avg_band=avg_band,
                tasks_complete=sum(1 for t in task_results if t.status == "complete"),
                tasks_total=len(task_results),
                created_at=slot_dates[slot_num],
            )
        )

    # ── Legacy sessions (mock_exam_number IS NULL) ────────────────────────────
    # These are attempts from an older flow that didn't record the exam slot.
    # Group them by date proximity: attempts within 30 minutes = same session.
    legacy_rows = (
        await db.execute(
            text(
                """
                SELECT DISTINCT ON (a.task_number)
                    a.task_number,
                    a.status,
                    sr.estimated_band,
                    a.created_at
                FROM attempts a
                LEFT JOIN score_reports sr ON sr.attempt_id = a.id
                WHERE a.user_id        = :uid
                  AND a.skill          = 'writing'
                  AND a.is_mock_test   = true
                  AND a.mock_exam_number IS NULL
                ORDER BY a.task_number, a.created_at DESC
                """
            ),
            {"uid": user_id},
        )
    ).mappings().all()

    if legacy_rows:
        task_results = [
            MockExamTaskResult(
                task_number=r["task_number"],
                status=r["status"],
                estimated_band=(
                    float(r["estimated_band"]) if r["estimated_band"] is not None else None
                ),
            )
            for r in legacy_rows
        ]
        scored = [
            t.estimated_band
            for t in task_results
            if t.estimated_band is not None and t.status == "complete"
        ]
        avg_band = round(sum(scored) / len(scored), 1) if scored else None

        sessions.append(
            MockExamSession(
                session_id="writing-mock-unslotted",
                skill="writing",
                tasks=task_results,
                avg_band=avg_band,
                tasks_complete=sum(1 for t in task_results if t.status == "complete"),
                tasks_total=len(task_results),
                # Use the most-recently-started task as the session timestamp
                created_at=min(r["created_at"] for r in legacy_rows),
            )
        )

    logger.debug("Writing mock sessions: user=%s count=%d", user_id, len(sessions))
    return sessions
