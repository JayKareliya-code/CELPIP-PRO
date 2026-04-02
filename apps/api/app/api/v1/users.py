from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import get_current_user
from app.core.quota import get_plan_limits
from app.models.user import User
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserMeResponse, SetTargetScoreRequest, WeakAreaItem
from app.schemas.attempt import QuotaStatusResponse

router = APIRouter()


def _build_user_response(user: User) -> UserMeResponse:
    """Shared helper to serialise a User ORM object into UserMeResponse."""
    return UserMeResponse(
        id=str(user.id),
        clerk_id=user.clerk_user_id,
        full_name=user.full_name or "",
        email=user.email,
        plan=user.plan,
        role="admin" if user.is_admin else "user",
        streak_days=user.streak_days,
        last_active_date=user.last_active_date.isoformat() if user.last_active_date else None,
        target_band=float(user.target_band) if user.target_band else None,
    )


@router.get("/me", response_model=UserMeResponse)
async def get_me(user: Annotated[User, Depends(get_current_user)]) -> UserMeResponse:
    """Return the authenticated user's profile."""
    return _build_user_response(user)


@router.patch("/me/target-score", response_model=UserMeResponse)
async def set_target_score(
    body: SetTargetScoreRequest,
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> UserMeResponse:
    """Persist the user's target band score (1–12)."""
    repo = UserRepository(db)
    await repo.update(user, target_band=body.target_band)
    # session.commit() is handled by get_db's context manager
    return _build_user_response(user)


_DIMENSION_LABELS: dict[str, str] = {
    "task_completion":  "Task Completion",
    "coherence":        "Coherence & Cohesion",
    "vocabulary":       "Vocabulary Range",
    "fluency":          "Fluency & Pronunciation",
    "grammar":          "Grammatical Accuracy",
    "task_fulfillment": "Task Fulfillment",
    "organization":     "Organization",
    "tone_register":    "Tone & Register",
}


@router.get("/me/weak-areas", response_model=list[WeakAreaItem])
async def get_weak_areas(
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> list[WeakAreaItem]:
    """Return the user's weakest rubric dimensions across all scored attempts.

    Aggregates avg score per dimension (last 20 complete attempts) and returns
    the lowest-scoring ones first so the dashboard can highlight focus areas.
    """
    rows = (await db.execute(
        text("""
            SELECT sd.dimension,
                   ROUND(AVG(sd.score)::numeric, 1) AS avg_score,
                   COUNT(*)                          AS attempt_count
            FROM   score_dimensions sd
            JOIN   score_reports    sr ON sr.id         = sd.report_id
            JOIN   attempts          a  ON a.id          = sr.attempt_id
            WHERE  a.user_id = :uid
              AND  a.status  = 'complete'
              AND  a.id IN (
                       SELECT id FROM attempts
                       WHERE  user_id = :uid AND status = 'complete'
                       ORDER  BY created_at DESC
                       LIMIT  20
                   )
            GROUP  BY sd.dimension
            ORDER  BY avg_score ASC
        """),
        {"uid": user.id},
    )).mappings().all()

    return [
        WeakAreaItem(
            dimension=r["dimension"],
            label=_DIMENSION_LABELS.get(r["dimension"],
                                        r["dimension"].replace("_", " ").title()),
            avg_score=float(r["avg_score"]),
            attempt_count=int(r["attempt_count"]),
        )
        for r in rows
    ]


@router.get("/me/quota", response_model=QuotaStatusResponse)
async def get_my_quota(
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> QuotaStatusResponse:
    """Return per-task quota usage for the authenticated user (single GROUP BY per skill)."""
    repo = AttemptRepository(db)

    # Two GROUP BY queries instead of 11 sequential round-trips
    s_used_raw = await repo.count_per_task(user.id, "speaking")
    w_used_raw = await repo.count_per_task(user.id, "writing")

    # Normalise to full task number ranges expected by the frontend
    s_used_per_task: dict[int, int] = {i: s_used_raw.get(i, 0) for i in range(9)}
    w_used_per_task: dict[int, int] = {i: w_used_raw.get(i, 0) for i in range(1, 3)}

    s_limits = get_plan_limits(user.plan, "speaking")
    w_limits = get_plan_limits(user.plan, "writing")

    s_limit = s_limits.per_task
    w_limit = w_limits.per_task

    if user.plan == "starter":
        # Starter: task practice locked; mock tests still allowed via enforce_quota
        s_can: dict[int, bool] = {i: False for i in range(9)}
        w_can: dict[int, bool] = {i: False for i in range(1, 3)}
    else:
        s_can = {i: (s_limit is None or usage < s_limit) for i, usage in s_used_per_task.items()}
        w_can = {i: (w_limit is None or usage < w_limit) for i, usage in w_used_per_task.items()}

    return QuotaStatusResponse(
        plan=user.plan,
        speaking_used_per_task=s_used_per_task,
        writing_used_per_task=w_used_per_task,
        speaking_limit_per_task=s_limit,
        writing_limit_per_task=w_limit,
        can_attempt_speaking=s_can,
        can_attempt_writing=w_can,
    )
