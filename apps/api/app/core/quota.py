from __future__ import annotations

import uuid as _uuid
import logging

from dataclasses import dataclass
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.mock_exam_repo import MockExamRepository
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PlanLimits:
    per_task:   int | None
    mock_tests: int | None


def get_plan_limits(plan: str, skill: str) -> PlanLimits:
    """Return per-task and mock-test attempt limits for a given plan + skill."""
    if plan == "starter":
        return PlanLimits(
            per_task=(
                settings.STARTER_SPEAKING_PER_TASK
                if skill == "speaking"
                else settings.STARTER_WRITING_PER_TASK
            ),
            mock_tests=(
                settings.STARTER_SPEAKING_MOCK_TESTS
                if skill == "speaking"
                else settings.STARTER_WRITING_MOCK_TESTS
            ),
        )
    if plan == "pro":
        return PlanLimits(
            per_task=(
                settings.PRO_SPEAKING_PER_TASK
                if skill == "speaking"
                else settings.PRO_WRITING_PER_TASK
            ),
            mock_tests=(
                settings.PRO_SPEAKING_MOCK_TESTS
                if skill == "speaking"
                else settings.PRO_WRITING_MOCK_TESTS
            ),
        )
    logger.warning("get_plan_limits: unknown plan %r — defaulting to zero access", plan)
    return PlanLimits(per_task=None, mock_tests=0)


async def _acquire_user_lock(db: AsyncSession, user_id) -> None:
    """Acquire a Postgres transaction-scoped advisory lock keyed to this user.

    Serialises concurrent quota checks for the same user so the count→insert
    pattern cannot race two attempts past the limit.  Released automatically
    on COMMIT or ROLLBACK.
    """
    try:
        await db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:uid, 0))"),
            {"uid": str(user_id)},
        )
    except Exception:
        # Advisory locks are Postgres-only; silently skip under SQLite in tests.
        pass



async def enforce_speaking_mock_quota(
    *,
    user: User,
    session_id: str,
    db: AsyncSession,
) -> None:
    """Full quota gate for speaking mock exam sessions.

    Called once per upload-url request (i.e. once per task in the session).
    Quota is consumed on the FIRST request for a new session_id so that
    abandon-and-restart behaviour counts against the quota — but re-entering
    the same session (redo) is always free.

    Waterfall
    ─────────
    1. Redo check  → session_id already in mock_exam_task_attempts → free (return).
    2. Plan quota  → count DISTINCT sessions < plan.mock_tests → free (return).
    3. Addon pool  → consume one credit from mock-test-speaking-addon → free (return).
    4. HTTP 402    → all exhausted.
    """
    from app.services.addon_credit_service import get_available_credits, consume_credit  # local import

    limits   = get_plan_limits(user.plan, "speaking")
    pool_key = "mock-test-speaking-addon"

    # Serialise concurrent quota checks for this user.
    await _acquire_user_lock(db, user.id)

    repo = MockExamRepository(db)

    # Step 1 — Redo: this session already started → always free.
    if await repo.has_session(user.id, session_id):
        return

    # Step 2 — Plan quota: check distinct sessions used vs plan limit.
    if limits.mock_tests:
        used = await repo.count_distinct_sessions(user.id)
        if used < limits.mock_tests:
            return  # within plan allocation

    # Step 3 — Addon pool fallback.
    available = await get_available_credits(user.id, pool_key, db)
    if available > 0:
        consumed = await consume_credit(user_id=user.id, task_key=pool_key, db=db)
        if consumed:
            logger.info(
                "enforce_speaking_mock_quota: addon credit consumed for user=%s",
                user.id,
            )
            return
        # Race condition: credits were > 0 but consume failed → reject.
        raise HTTPException(
            status_code=402,
            detail={
                "code":        "QUOTA_EXCEEDED",
                "message":     "No mock exam credits remaining. Purchase a Mock Test Bundle to continue.",
                "upgrade_url": "/billing",
            },
        )

    # Step 4 — All exhausted.
    used = await repo.count_distinct_sessions(user.id)
    raise HTTPException(
        status_code=402,
        detail={
            "code":        "MOCK_EXAM_LOCKED",
            "used":        used,
            "limit":       limits.mock_tests,
            "message":     (
                "You have used all your mock exam slots. "
                "Purchase a Mock Test Bundle from the billing page to unlock more, "
                "or upgrade to Pro."
            ),
            "upgrade_url": "/billing",
        },
    )


async def enforce_quota(
    user: User,
    skill: str,
    task_number: int,
    is_mock_test: bool,
    db: AsyncSession,
    mock_exam_number: int | None = None,
    prompt_id: _uuid.UUID | None = None,
) -> None:
    """Raise HTTP 402 if the user is over-quota for this skill + task.

    Must be called inside the attempt creation transaction.

    Practice quota waterfall (non-mock):
    ────────────────────────────────────
    1. Prompt-level redo check    → always free if user already attempted this prompt.
    2. Plan quota check           → allow if distinct-prompts-used < per_task limit.
       - Starter: 2 per task (configurable via STARTER_SPEAKING/WRITING_PER_TASK).
       - Pro:     5 per task (configurable via PRO_SPEAKING/WRITING_PER_TASK).
    3. Addon credit check         → consume one credit from addon_credits if available.
    4. HTTP 402                   → plan quota exhausted and no addon credits.

    Mock exam quota:
    ────────────────
    - Slot-level redo: re-doing a previously started slot is always free.
    - Only new slots count against the plan's mock_tests limit.
    - Addon credits do NOT apply to mock exams.
    """
    from app.services.addon_credit_service import consume_credit  # local import avoids circular

    repo   = AttemptRepository(db)
    limits = get_plan_limits(user.plan, skill)

    # Serialize concurrent quota checks for this user before counting.
    await _acquire_user_lock(db, user.id)

    # ── Mock exam path ────────────────────────────────────────────────────────

    if is_mock_test:
        from app.services.addon_credit_service import get_available_credits  # local import
        pool_key = f"mock-test-{skill}-addon"

        if not limits.mock_tests:
            # No plan-level mock allocation. Both Starter and Pro carry a mock
            # quota, so this path only fires as a safety net for a plan that
            # resolves to zero access — check the addon pool first.
            addon_credits = await get_available_credits(user.id, pool_key, db)
            if addon_credits <= 0:
                raise HTTPException(
                    status_code=402,
                    detail={
                        "code":        "MOCK_EXAM_LOCKED",
                        "message":     "Mock exams require a Pro plan or a Mock Test Bundle purchase.",
                        "upgrade_url": "/billing",
                    },
                )
            # Starter has addon credits — fall through to consume one.
            consumed = await consume_credit(user_id=user.id, task_key=pool_key, db=db)
            if consumed:
                logger.info(
                    "enforce_quota: mock_bundle pool credit consumed (starter) for user=%s skill=%s",
                    user.id, skill,
                )
                return
            # Credits were present but consume failed (race) — reject.
            raise HTTPException(status_code=402, detail={
                "code":    "QUOTA_EXCEEDED",
                "message": "No mock exam credits remaining. Purchase a Mock Test Bundle to continue.",
                "upgrade_url": "/billing",
            })

        # Pro plan — check plan quota first.
        if mock_exam_number is not None:
            already_used = await repo.has_used_mock_slot(user.id, skill, mock_exam_number)
            if already_used:
                return  # redo — no quota charge

        used = await repo.count_distinct_mock_slots(user.id, skill)
        if used < limits.mock_tests:
            return  # within plan quota

        # Plan quota exhausted — try addon pool credit.
        consumed = await consume_credit(user_id=user.id, task_key=pool_key, db=db)
        if consumed:
            logger.info(
                "enforce_quota: mock_bundle pool credit consumed for user=%s skill=%s",
                user.id, skill,
            )
            return

        raise HTTPException(status_code=402, detail={
            "code":        "QUOTA_EXCEEDED",
            "used":        used,
            "limit":       limits.mock_tests,
            "message":     (
                "You have used all your mock exam slots. "
                "Purchase a Mock Test Bundle from the billing page to unlock more."
            ),
            "upgrade_url": "/billing",
        })

    # ── Practice attempt path ─────────────────────────────────────────────────

    task_key = f"{skill}-task-{task_number}"

    # Step 1 — Prompt-level redo: retrying an already-attempted prompt is free.
    if prompt_id is not None:
        already_used = await repo.has_used_prompt(user.id, skill, prompt_id)
        if already_used:
            return

    # Step 2 — Plan quota check.
    if limits.per_task is not None:
        used = await repo.count_distinct_prompts(user.id, skill, task_number)
        if used < limits.per_task:
            return  # within plan quota — allow attempt

    # Step 3 — Addon credit fallback.
    consumed = await consume_credit(user_id=user.id, task_key=task_key, db=db)
    if consumed:
        return  # addon credit consumed — allow attempt

    # Step 4 — Both exhausted → 402.
    used = await repo.count_distinct_prompts(user.id, skill, task_number) if limits.per_task else 0
    limit_str = str(limits.per_task) if limits.per_task is not None else "0"

    raise HTTPException(
        status_code=402,
        detail={
            "code":        "QUOTA_EXCEEDED",
            "used":        used,
            "limit":       limits.per_task,
            "message":     (
                f"You have used all {limit_str} free attempts for this task. "
                "Purchase a practice pack or upgrade your plan for more."
            ),
            "upgrade_url": "/billing",
        },
    )
