from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.api.v1.billing.schemas import AddonCreditSummaryResponse, TaskCreditStat, MockCreditStat
from app.services.addon_credit_service import get_addon_credit_summary

router = APIRouter()


@router.get("/billing/addon-credits", response_model=AddonCreditSummaryResponse)
async def get_my_addon_credits(
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> AddonCreditSummaryResponse:
    """Return per-skill, per-task addon credit inventory for the authenticated user.

    Includes both active and exhausted rows so the billing UI can render
    progress bars for fully-consumed packs alongside live balances.
    Refunded rows are excluded.

    Response is safe to cache for ~30 s on the client (TanStack Query staleTime).
    No writes are performed here.
    """
    summary, mock_raw = await get_addon_credit_summary(user.id, db)

    def _to_stat_map(skill_data: dict[int, dict[str, int]]) -> dict[int, TaskCreditStat]:
        return {
            task_num: TaskCreditStat(
                available=stat["available"],
                purchased=stat["purchased"],
            )
            for task_num, stat in skill_data.items()
        }

    mock_stats = {
        skill: MockCreditStat(available=d["available"], purchased=d["purchased"])
        for skill, d in mock_raw.items()
    }

    return AddonCreditSummaryResponse(
        speaking=_to_stat_map(summary.get("speaking", {})),
        writing =_to_stat_map(summary.get("writing",  {})),
        mock    =mock_stats,
    )
