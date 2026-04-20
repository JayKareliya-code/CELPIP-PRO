"""
Practice attempt history — GET /api/v1/history

Returns only practice attempts (is_mock_test=False), paginated, newest-first.
Joins score_reports for band scores and resolves prompt titles in a single
batch query per skill to avoid N+1.
"""
from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.score_report import ScoreReport
from app.schemas.history import HistoryItem, PaginatedHistory
from ._helpers import build_task_title

logger = logging.getLogger(__name__)


async def get_practice_history(
    db: AsyncSession,
    user_id: UUID,
    skill: str | None = None,
    page: int = 1,
    limit: int = 10,
) -> PaginatedHistory:
    """Return paginated practice attempt history for one user.

    Args:
        db:      Async SQLAlchemy session.
        user_id: The requesting user's UUID.
        skill:   Optional filter — "speaking" or "writing". None returns all.
        page:    1-indexed page number.
        limit:   Rows per page (1–50).

    Returns:
        PaginatedHistory with items, total count, and pagination metadata.
    """
    offset = (page - 1) * limit

    # Practice attempts only — never include mock-exam rows here
    base_filter = [
        Attempt.user_id == user_id,
        Attempt.is_mock_test == False,  # noqa: E712
    ]
    if skill:
        base_filter.append(Attempt.skill == skill)

    # ── Total count ───────────────────────────────────────────────────────────
    total: int = (
        await db.execute(
            select(func.count()).select_from(Attempt).where(*base_filter)
        )
    ).scalar_one()

    # ── Paginated rows — LEFT JOIN for band score ─────────────────────────────
    stmt = (
        select(Attempt, ScoreReport.estimated_band)
        .outerjoin(ScoreReport, ScoreReport.attempt_id == Attempt.id)
        .where(*base_filter)
        .order_by(Attempt.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()

    if not rows:
        return PaginatedHistory(
            items=[], total=total, page=page, limit=limit,
            has_next=(offset + limit) < total,
        )

    # ── Batch-fetch prompt titles (one query per skill present) ───────────────
    prompt_titles: dict[UUID, str] = {}

    speaking_ids = [r.Attempt.prompt_id for r in rows if r.Attempt.skill == "speaking"]
    if speaking_ids:
        for r in (await db.execute(
            text("SELECT id, title FROM speaking_prompts WHERE id = ANY(:ids)"),
            {"ids": speaking_ids},
        )).mappings():
            prompt_titles[r["id"]] = r["title"]

    writing_ids = [r.Attempt.prompt_id for r in rows if r.Attempt.skill == "writing"]
    if writing_ids:
        for r in (await db.execute(
            text("SELECT id, title FROM writing_prompts WHERE id = ANY(:ids)"),
            {"ids": writing_ids},
        )).mappings():
            prompt_titles[r["id"]] = r["title"]

    # ── Assemble items ────────────────────────────────────────────────────────
    items = [
        HistoryItem(
            attempt_id=row.Attempt.id,
            skill=row.Attempt.skill,
            task_number=row.Attempt.task_number,
            task_title=build_task_title(
                skill=row.Attempt.skill,
                task_number=row.Attempt.task_number,
                prompt_title=prompt_titles.get(row.Attempt.prompt_id),
            ),
            is_mock_test=False,
            status=row.Attempt.status,
            estimated_band=(
                float(row.estimated_band) if row.estimated_band is not None else None
            ),
            created_at=row.Attempt.created_at,
        )
        for row in rows
    ]

    logger.debug(
        "Practice history: user=%s skill=%s page=%d total=%d",
        user_id, skill, page, total,
    )
    return PaginatedHistory(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_next=(offset + limit) < total,
    )
