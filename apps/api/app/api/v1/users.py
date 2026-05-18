import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select, text, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db
from app.core.rate_limit import limiter
from app.core.security import get_current_user, require_recent_auth
from app.core.quota import get_plan_limits
from app.models.user import User
from app.models.retry_credit_ledger import RetryCreditLedger
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserMeResponse, SetTargetScoreRequest, WeakAreaItem
from app.schemas.attempt import QuotaStatusResponse
from app.services import retry_credit_service
from app.services.addon_credit_service import get_credits_per_task, get_available_credits
from app.models.tos_acceptance import TosAcceptance

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
    """Return per-task quota + retry-credit balance + add-on credits for the user.

    Three buckets surfaced for the frontend, mirroring the quota gate:
      - `*_used_per_task` / `*_limit_per_task`            → plan tier slots
      - `*_addon_credits_per_task` / `*_mock_addon_credits` → add-on packs
      - `retry_credits_balance` / `..._lifetime_granted`    → redo/retake pool
    """
    repo = AttemptRepository(db)

    # Per-task DISTINCT prompt counts — mirror enforce_quota logic.
    s_used_raw = await repo.count_distinct_prompts_per_skill(user.id, "speaking")
    w_used_raw = await repo.count_distinct_prompts_per_skill(user.id, "writing")

    s_used_per_task: dict[int, int] = {i: s_used_raw.get(i, 0) for i in range(9)}
    w_used_per_task: dict[int, int] = {i: w_used_raw.get(i, 0) for i in range(1, 3)}

    # Per-task add-on credit balances — populated by the webhook on purchase.
    # When plan quota is exhausted on a NEW prompt the quota gate consumes
    # from these. The frontend adds them to plan limit for the effective
    # ring on each task card.
    s_addon_credits = await get_credits_per_task(user.id, "speaking", db)
    w_addon_credits = await get_credits_per_task(user.id, "writing",  db)

    # Distinct speaking mock exam sessions (mock_exam_task_attempts table).
    mock_result = await db.execute(
        text(
            "SELECT COUNT(DISTINCT session_id) "
            "FROM mock_exam_task_attempts "
            "WHERE user_id = :uid"
        ),
        {"uid": user.id},
    )
    speaking_mock_used: int = mock_result.scalar() or 0

    # Writing mock attempts (attempts table with is_mock_test=true).
    writing_mock_used: int = await repo.count_mock_tests_by_user_skill(user.id, "writing")

    s_limits = get_plan_limits(user.plan, "speaking")
    w_limits = get_plan_limits(user.plan, "writing")

    s_limit = s_limits.per_task
    w_limit = w_limits.per_task

    # Retry-credit balance + lifetime grant — drives the "X/Y" progress bar.
    retry_credits          = await retry_credit_service.get_balance(db, user.id)
    retry_credits_lifetime = await retry_credit_service.get_lifetime_granted(db, user.id)

    # can_attempt for a NEW prompt: usage < plan limit, OR add-on credits left.
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

    # Mock add-on pool credits — sum available across rows per skill key.
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
        # Retry credit pool — currency for redoes and retakes.
        retry_credits_balance=retry_credits,
        retry_credits_lifetime_granted=retry_credits_lifetime,
    )


# ── Retry-credit ledger ───────────────────────────────────────────────────────


class RetryCreditLedgerEntry(BaseModel):
    """One historical movement of the user's retry-credit balance."""
    id:         str
    delta:      int
    reason:     str
    attempt_id: str | None
    source_ref: str | None
    created_at: datetime


class RetryCreditLedgerResponse(BaseModel):
    balance: int
    entries: list[RetryCreditLedgerEntry]


@router.get("/me/retry-credits/ledger", response_model=RetryCreditLedgerResponse)
async def get_my_retry_credit_ledger(
    user:  Annotated[User, Depends(get_current_user)],
    db:    Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, ge=1, le=200),
) -> RetryCreditLedgerResponse:
    """Return the user's retry-credit balance and recent ledger entries.

    Powers the Settings → Usage tab. Pro users see grants and spends;
    starter users see an empty list and a 0 balance.
    """
    balance = await retry_credit_service.get_balance(db, user.id)

    rows = (await db.execute(
        select(RetryCreditLedger)
        .where(RetryCreditLedger.user_id == user.id)
        .order_by(RetryCreditLedger.created_at.desc())
        .limit(limit)
    )).scalars().all()

    return RetryCreditLedgerResponse(
        balance=balance,
        entries=[
            RetryCreditLedgerEntry(
                id=str(r.id),
                delta=r.delta,
                reason=r.reason,
                attempt_id=str(r.attempt_id) if r.attempt_id else None,
                source_ref=r.source_ref,
                created_at=r.created_at,
            )
            for r in rows
        ],
    )


# ── T&C acceptance ────────────────────────────────────────────────────────────

class AcceptTosRequest(BaseModel):
    version: str = Field(..., max_length=32)


@router.post("/me/accept-tos", response_model=UserMeResponse)
async def accept_tos(
    request: Request,
    body:    AcceptTosRequest,
    user:    Annotated[User, Depends(get_current_user)],
    db:      Annotated[AsyncSession, Depends(get_db)],
) -> UserMeResponse:
    """Record the Terms-of-Service version the user has accepted.

    Writes to two places:
    - users.tos_accepted_at / tos_version  — fast gate-check field (overwritten)
    - tos_acceptances                       — append-only audit log (never deleted)

    The audit row captures the client IP and User-Agent as legal evidence of
    consent under Quebec's Law 25.
    """
    if body.version != settings.TOS_CURRENT_VERSION:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown ToS version {body.version!r}. "
                f"Current version is {settings.TOS_CURRENT_VERSION}."
            ),
        )

    now = datetime.now(timezone.utc)

    # ── 1. Resolve client IP ──────────────────────────────────────────────────
    # Prefer X-Forwarded-For (set by Render / reverse proxies) over the
    # raw socket address, which is the proxy IP in production.
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For may be "client, proxy1, proxy2" — take the first
        ip_address: str | None = forwarded_for.split(",")[0].strip()
    else:
        ip_address = request.client.host if request.client else None

    user_agent: str | None = request.headers.get("User-Agent")

    # ── 2. Append to audit log (immutable compliance record) ─────────────────
    audit_row = TosAcceptance(
        user_id=user.id,
        tos_version=body.version,
        accepted_at=now,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(audit_row)

    # ── 3. Update fast gate-check fields on the user row ─────────────────────
    user.tos_accepted_at = now
    user.tos_version = body.version
    db.add(user)

    await db.flush()
    logger.info(
        "ToS accepted: user_id=%s version=%s ip=%s",
        user.id, body.version, ip_address,
    )
    return _build_user_response(user)


# ── Account deletion (Quebec Law 25 / PIPEDA) ─────────────────────────────────

class DeleteAccountRequest(BaseModel):
    confirm: str = Field(..., description="Must equal 'DELETE' to confirm.")


@router.delete("/me", status_code=204)
@limiter.limit("2/hour")
async def delete_my_account(
    request: Request,
    body: DeleteAccountRequest,
    user: Annotated[User, Depends(require_recent_auth)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Irreversibly delete the authenticated user's account and all data.

    Defense-in-depth on a destructive endpoint:
      * ``require_recent_auth`` — caller's JWT must have been minted within
        the last 5 minutes, so a stolen/leaked token outside that window
        cannot wipe an account.
      * ``2/hour`` rate limit — bounds blast radius if a token IS leaked.
      * Confirmation string — prevents accidental "fat-finger" calls from
        third-party tooling.

    Order of operations:
      1. Snapshot Stripe customer ids + S3 prefixes BEFORE deleting the DB row
         (so they survive the row's cascade-delete and we still know what to
         clean up).
      2. Delete the User row inside the request transaction — relies on
         ``ON DELETE CASCADE`` to wipe attempts/subscriptions/credits/etc.
      3. Commit. Once committed, the user is gone from this product's
         perspective even if best-effort cleanup later fails.
      4. Best-effort Stripe customer detach + S3 object purge AFTER commit.
         Failures here are logged but never resurrect the DB row.

    The Clerk account is NOT deleted here (Clerk is the source of truth for
    identity). The Clerk user should be deleted via a background webhook from
    Clerk's dashboard or by the frontend calling Clerk's deleteUser() next.
    """
    if body.confirm != "DELETE":
        raise HTTPException(
            status_code=400,
            detail="Confirmation token mismatch. Send {\"confirm\":\"DELETE\"}.",
        )

    # ── 1. Snapshot side-effect targets BEFORE deleting the row ───────────────
    from app.models.subscription import Subscription  # noqa: PLC0415

    sub_rows = (await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )).scalars().all()
    customer_ids: set[str] = {
        s.stripe_customer_id for s in sub_rows if s.stripe_customer_id
    }
    s3_prefixes: list[str] = [
        f"{settings.S3_AUDIO_PREFIX}{user.id}/",
        f"mock-tests/{user.id}/",
    ]
    user_id_for_log = user.id

    # ── 2. Delete the User row (cascades to attempts, subscriptions, …) ───────
    await db.delete(user)
    await db.commit()
    logger.info("Account deleted: user_id=%s", user_id_for_log)

    # ── 3. Best-effort external cleanup (post-commit) ─────────────────────────
    # The row is gone; from this product's POV the user no longer exists. Any
    # failure here leaves "garbage" Stripe customers / S3 objects, NOT a
    # privacy violation. A future periodic janitor can sweep stragglers.
    for cid in customer_ids:
        try:
            import stripe  # noqa: PLC0415
            stripe.Customer.delete(cid)
        except Exception as exc:
            logger.warning("Stripe customer delete failed for %s: %s", cid, exc)

    try:
        from app.services.storage.presigner import get_s3_client  # noqa: PLC0415

        client = get_s3_client()
        for prefix in s3_prefixes:
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

    return Response(status_code=204)
