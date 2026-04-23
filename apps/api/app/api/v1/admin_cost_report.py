"""
Admin — AI Cost Report

GET /admin/cost-report?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=100

Aggregates the ``ai_cost_log`` table (joined through ``attempts`` to reach
``users``) and returns spend broken down by model, operation, and top users.

Auth: ``require_admin`` — non-admin callers receive 403.
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Any

import sqlalchemy as sa
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import require_admin
from app.models.user import User

logger = structlog.get_logger(__name__)
router = APIRouter()

Admin = Annotated[User, Depends(require_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _parse_date(value: str | None, default: date) -> date:
    if not value:
        return default
    if not _DATE_RE.match(value):
        raise HTTPException(status_code=422, detail=f"Invalid date format: {value!r}. Use YYYY-MM-DD.")
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid date: {value!r}.")


@router.get("/cost-report")
async def get_cost_report(
    db: DB,
    _: Admin,
    from_date: str | None = Query(None, alias="from", description="Start date YYYY-MM-DD (inclusive). Default: 30 days ago."),
    to_date: str | None = Query(None, alias="to", description="End date YYYY-MM-DD (inclusive). Default: today."),
    limit: int = Query(100, ge=1, le=500, description="Max number of users to return in by_user (ordered by spend desc)."),
) -> dict[str, Any]:
    """
    Aggregated AI spend report for the admin dashboard.

    Returns:
    ```json
    {
      "period": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"},
      "total_usd": 12.345678,
      "by_model": {"gpt-4o-mini": 10.0, "whisper-1": 2.345},
      "by_operation": {"scoring": 9.0, "stt": 2.0, "feedback": 1.345},
      "by_user": [
        {"user_id": "...", "email": "...", "plan": "pro",
         "total_tokens": 45000, "total_usd": 3.21}
      ]
    }
    ```
    """
    today = datetime.now(timezone.utc).date()
    date_from = _parse_date(from_date, today - timedelta(days=30))
    date_to = _parse_date(to_date, today)

    if date_from > date_to:
        raise HTTPException(status_code=422, detail="'from' must not be after 'to'.")

    # Timestamps: from midnight on date_from to end-of-day on date_to (UTC)
    ts_from = datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
    ts_to = datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59, tzinfo=timezone.utc)

    # ── 1. Grand total ────────────────────────────────────────────────────────
    total_row = (await db.execute(
        sa.text(
            "SELECT COALESCE(SUM(c.estimated_cost_usd), 0) AS total_usd "
            "FROM ai_cost_log c "
            "WHERE c.created_at BETWEEN :from AND :to"
        ),
        {"from": ts_from, "to": ts_to},
    )).fetchone()
    total_usd: float = float(total_row.total_usd) if total_row else 0.0

    # ── 2. Breakdown by model ─────────────────────────────────────────────────
    model_rows = (await db.execute(
        sa.text(
            "SELECT c.model, COALESCE(SUM(c.estimated_cost_usd), 0) AS usd "
            "FROM ai_cost_log c "
            "WHERE c.created_at BETWEEN :from AND :to "
            "GROUP BY c.model ORDER BY usd DESC"
        ),
        {"from": ts_from, "to": ts_to},
    )).fetchall()
    by_model: dict[str, float] = {r.model: float(r.usd) for r in model_rows}

    # ── 3. Breakdown by operation ─────────────────────────────────────────────
    op_rows = (await db.execute(
        sa.text(
            "SELECT c.operation, COALESCE(SUM(c.estimated_cost_usd), 0) AS usd "
            "FROM ai_cost_log c "
            "WHERE c.created_at BETWEEN :from AND :to "
            "GROUP BY c.operation ORDER BY usd DESC"
        ),
        {"from": ts_from, "to": ts_to},
    )).fetchall()
    by_operation: dict[str, float] = {r.operation: float(r.usd) for r in op_rows}

    # ── 4. Top users by spend ─────────────────────────────────────────────────
    # ai_cost_log → attempts (user_id) → users (email, plan)
    user_rows = (await db.execute(
        sa.text(
            "SELECT u.id AS user_id, u.email, u.plan, "
            "       COALESCE(SUM(c.total_tokens), 0)          AS total_tokens, "
            "       COALESCE(SUM(c.estimated_cost_usd), 0)    AS total_usd "
            "FROM ai_cost_log c "
            "JOIN  attempts a ON a.id = c.attempt_id "
            "JOIN  users    u ON u.id = a.user_id "
            "WHERE c.created_at BETWEEN :from AND :to "
            "GROUP BY u.id, u.email, u.plan "
            "ORDER BY total_usd DESC "
            "LIMIT :lim"
        ),
        {"from": ts_from, "to": ts_to, "lim": limit},
    )).fetchall()

    by_user = [
        {
            "user_id": str(r.user_id),
            "email": r.email,
            "plan": r.plan,
            "total_tokens": int(r.total_tokens),
            "total_usd": float(r.total_usd),
        }
        for r in user_rows
    ]

    logger.info(
        "admin.cost_report.fetched",
        date_from=str(date_from),
        date_to=str(date_to),
        total_usd=total_usd,
        user_count=len(by_user),
    )

    return {
        "period": {"from": str(date_from), "to": str(date_to)},
        "total_usd": total_usd,
        "by_model": by_model,
        "by_operation": by_operation,
        "by_user": by_user,
    }
