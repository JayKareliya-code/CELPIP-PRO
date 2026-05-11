import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import text, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db
from app.core.security import get_current_user
from app.core.quota import get_plan_limits
from app.models.user import User
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserMeResponse, SetTargetScoreRequest, WeakAreaItem
from app.schemas.attempt import QuotaStatusResponse
from app.services.addon_credit_service import get_credits_per_task, get_available_credits

logger = logging.getLogger(__name__)

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
        tos_accepted_at=user.tos_accepted_at.isoformat() if user.tos_accepted_at else None,
        tos_version=user.tos_version,
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
    """Return per-task quota usage for the authenticated user.

    Counts DISTINCT prompts attempted per task — not total attempts.
    This matches enforce_quota: retrying the same prompt is always free and
    must not inflate the displayed count or trigger a false can_attempt=False.
    """
    repo = AttemptRepository(db)

    # Per-task DISTINCT prompt counts — one query per skill (mirrors enforce_quota logic)
    s_used_raw = await repo.count_distinct_prompts_per_skill(user.id, "speaking")
    w_used_raw = await repo.count_distinct_prompts_per_skill(user.id, "writing")

    # Normalise to full task number ranges expected by the frontend
    s_used_per_task: dict[int, int] = {i: s_used_raw.get(i, 0) for i in range(9)}
    w_used_per_task: dict[int, int] = {i: w_used_raw.get(i, 0) for i in range(1, 3)}

    # Addon credits per task — queried separately; 0 when no addons purchased.
    # A speaking_pack purchase creates one row per task at webhook time, so this
    # correctly reflects both module-level packs AND task-specific custom bundles.
    s_addon_credits = await get_credits_per_task(user.id, "speaking", db)
    w_addon_credits = await get_credits_per_task(user.id, "writing",  db)

    # Distinct speaking mock exam sessions (uses the mock_exam_task_attempts table)
    mock_result = await db.execute(
        text(
            "SELECT COUNT(DISTINCT session_id) "
            "FROM mock_exam_task_attempts "
            "WHERE user_id = :uid"
        ),
        {"uid": user.id},
    )
    speaking_mock_used: int = mock_result.scalar() or 0

    # Writing mock attempts (uses the attempts table with is_mock_test=true)
    writing_mock_used: int = await repo.count_mock_tests_by_user_skill(user.id, "writing")

    s_limits = get_plan_limits(user.plan, "speaking")
    w_limits = get_plan_limits(user.plan, "writing")

    s_limit = s_limits.per_task
    w_limit = w_limits.per_task

    # can_attempt = True when usage < planLimit OR addon credits available for that task.
    # This allows starter users with a purchased addon to still start attempts.
    def _can_attempt_speaking(task_num: int, usage: int) -> bool:
        if s_limit is not None and usage < s_limit:
            return True
        return s_addon_credits.get(task_num, 0) > 0

    def _can_attempt_writing(task_num: int, usage: int) -> bool:
        if w_limit is not None and usage < w_limit:
            return True
        return w_addon_credits.get(task_num, 0) > 0

    s_can = {i: _can_attempt_speaking(i, usage) for i, usage in s_used_per_task.items()}
    w_can = {i: _can_attempt_writing(i, usage)  for i, usage in w_used_per_task.items()}

    # Mock addon pool credits — sum available credits for each skill pool key.
    s_mock_addon = await get_available_credits(user.id, "mock-test-speaking-addon", db)
    w_mock_addon = await get_available_credits(user.id, "mock-test-writing-addon",  db)

    return QuotaStatusResponse(
        plan=user.plan,
        speaking_used_per_task=s_used_per_task,
        writing_used_per_task=w_used_per_task,
        speaking_limit_per_task=s_limit,
        writing_limit_per_task=w_limit,
        can_attempt_speaking=s_can,
        can_attempt_writing=w_can,
        speaking_addon_credits_per_task=s_addon_credits,
        writing_addon_credits_per_task=w_addon_credits,
        speaking_mock_tests_used=speaking_mock_used,
        writing_mock_tests_used=writing_mock_used,
        speaking_mock_tests_limit=s_limits.mock_tests,
        writing_mock_tests_limit=w_limits.mock_tests,
        speaking_mock_addon_credits=s_mock_addon,
        writing_mock_addon_credits=w_mock_addon,
    )


# ── T&C acceptance ────────────────────────────────────────────────────────────

class AcceptTosRequest(BaseModel):
    version: str = Field(..., max_length=32)


@router.post("/me/accept-tos", response_model=UserMeResponse)
async def accept_tos(
    body: AcceptTosRequest,
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> UserMeResponse:
    """Record the Terms-of-Service version the user has accepted."""
    if body.version != settings.TOS_CURRENT_VERSION:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown ToS version {body.version!r}. "
                f"Current version is {settings.TOS_CURRENT_VERSION}."
            ),
        )
    user.tos_accepted_at = datetime.now(timezone.utc)
    user.tos_version = body.version
    db.add(user)
    await db.flush()
    return _build_user_response(user)


# ── GDPR / CCPA: account deletion ─────────────────────────────────────────────

class DeleteAccountRequest(BaseModel):
    confirm: str = Field(..., description="Must equal 'DELETE' to confirm.")


@router.delete("/me", status_code=204)
async def delete_my_account(
    body: DeleteAccountRequest,
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Irreversibly delete the authenticated user's account and all data.

    Steps:
      1. Cancel any active Stripe subscription / detach the customer.
      2. Delete S3 audio objects owned by this user (best-effort).
      3. Delete the User row → ON DELETE CASCADE wipes dependent rows.

    The Clerk account is NOT deleted here (Clerk is the source of truth for
    identity). The Clerk user should be deleted via a background webhook from
    Clerk's dashboard or by the frontend calling Clerk's deleteUser() next.
    """
    if body.confirm != "DELETE":
        raise HTTPException(
            status_code=400,
            detail="Confirmation token mismatch. Send {\"confirm\":\"DELETE\"}.",
        )

    # ── 1. Detach Stripe customer (best-effort) ───────────────────────────────
    try:
        import stripe  # noqa: PLC0415
        from app.models.subscription import Subscription  # noqa: PLC0415
        from sqlalchemy import select  # noqa: PLC0415

        sub_rows = (await db.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )).scalars().all()
        customer_ids = {s.stripe_customer_id for s in sub_rows if s.stripe_customer_id}
        for cid in customer_ids:
            try:
                stripe.Customer.delete(cid)
            except Exception as exc:
                logger.warning("Stripe customer delete failed for %s: %s", cid, exc)
    except Exception as exc:
        logger.warning("Stripe cleanup failed during account deletion: %s", exc)

    # ── 2. Delete S3 audio objects (best-effort) ──────────────────────────────
    try:
        from app.services.storage_service import _get_s3_client  # noqa: PLC0415

        client = _get_s3_client()
        for prefix in (
            f"{settings.S3_AUDIO_PREFIX}{user.id}/",
            f"mock-tests/{user.id}/",
        ):
            paginator = client.get_paginator("list_objects_v2")
            for page in paginator.paginate(
                Bucket=settings.S3_BUCKET_NAME, Prefix=prefix
            ):
                objs = page.get("Contents") or []
                if not objs:
                    continue
                client.delete_objects(
                    Bucket=settings.S3_BUCKET_NAME,
                    Delete={"Objects": [{"Key": o["Key"]} for o in objs]},
                )
    except Exception as exc:
        logger.warning("S3 cleanup failed during account deletion: %s", exc)

    # ── 3. Delete the User row (cascades to attempts, subscriptions, …) ───────
    await db.delete(user)
    await db.flush()

    logger.info("Account deleted: user_id=%s", user.id)
    return Response(status_code=204)
