"""
History service — paginated attempt history for a user.

Joins attempts with score_reports to include band scores.
Supports optional skill filter (speaking | writing).
"""
from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.score_report import ScoreReport
from app.schemas.history import HistoryItem, PaginatedHistory

logger = logging.getLogger(__name__)


async def get_user_history(
    db: AsyncSession,
    user_id: UUID,
    skill: str | None = None,
    page: int = 1,
    limit: int = 10,
) -> PaginatedHistory:
    """
    Return a paginated list of attempt history for one user.

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

    # Base filter
    base_filter = [Attempt.user_id == user_id]
    if skill:
        base_filter.append(Attempt.skill == skill)

    # Total count (for pagination UI)
    count_stmt = select(func.count()).select_from(Attempt).where(*base_filter)
    total: int = (await db.execute(count_stmt)).scalar_one()

    # Paginated query — LEFT JOIN to score_reports to get estimated_band
    stmt = (
        select(Attempt, ScoreReport.estimated_band)
        .outerjoin(ScoreReport, ScoreReport.attempt_id == Attempt.id)
        .where(*base_filter)
        .order_by(Attempt.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()

    # Fetch prompt titles in one batch query per skill type present
    attempt_ids = [row.Attempt.id for row in rows]
    prompt_titles: dict[UUID, str] = {}

    if rows:
        # Speaking prompt titles
        speaking_prompt_ids = [
            row.Attempt.prompt_id
            for row in rows
            if row.Attempt.skill == "speaking"
        ]
        if speaking_prompt_ids:
            sp_rows = await db.execute(
                text("SELECT id, title FROM speaking_prompts WHERE id = ANY(:ids)"),
                {"ids": speaking_prompt_ids},
            )
            for r in sp_rows.mappings():
                prompt_titles[r["id"]] = r["title"]

        # Writing prompt titles
        writing_prompt_ids = [
            row.Attempt.prompt_id
            for row in rows
            if row.Attempt.skill == "writing"
        ]
        if writing_prompt_ids:
            wp_rows = await db.execute(
                text("SELECT id, title FROM writing_prompts WHERE id = ANY(:ids)"),
                {"ids": writing_prompt_ids},
            )
            for r in wp_rows.mappings():
                prompt_titles[r["id"]] = r["title"]

    items = [
        HistoryItem(
            attempt_id=row.Attempt.id,
            skill=row.Attempt.skill,
            task_number=row.Attempt.task_number,
            task_title=prompt_titles.get(
                row.Attempt.prompt_id,
                f"Task {row.Attempt.task_number}",
            ),
            is_mock_test=row.Attempt.is_mock_test,
            status=row.Attempt.status,
            estimated_band=float(row.estimated_band) if row.estimated_band is not None else None,
            created_at=row.Attempt.created_at,
        )
        for row in rows
    ]

    return PaginatedHistory(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_next=(offset + limit) < total,
    )
