from __future__ import annotations

import uuid as _uuid
import logging

from dataclasses import dataclass
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.attempt_repo import AttemptRepository
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
        if not limits.mock_tests:
            raise HTTPException(
                status_code=402,
                detail={
                    "code":        "MOCK_EXAM_LOCKED",
                    "message":     "Mock exams require a Pro plan.",
                    "upgrade_url": "/billing",
                },
            )

        if mock_exam_number is not None:
            already_used = await repo.has_used_mock_slot(user.id, skill, mock_exam_number)
            if already_used:
                return  # redo — no quota charge

        used = await repo.count_distinct_mock_slots(user.id, skill)
        if used < limits.mock_tests:
            return  # within plan quota

        # Plan quota exhausted — try mock_bundle addon credit for this slot.
        if mock_exam_number is not None:
            slot_key = f"mock-test-{skill}-{mock_exam_number}"
            consumed = await consume_credit(user_id=user.id, task_key=slot_key, db=db)
            if consumed:
                logger.info(
                    "enforce_quota: mock_bundle credit consumed for user=%s skill=%s slot=%d",
                    user.id, skill, mock_exam_number,
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
        return

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


async def enforce_mock_exam_plan_access(*, user: User) -> None:
    """Plan-access gate for mock exam uploads.

    Starter plan: mock exams are locked (402).
    Pro plan: unlimited — retrying the same exam is always free.
    """
    limits = get_plan_limits(user.plan, "speaking")
    if not limits.mock_tests:
        raise HTTPException(
            status_code=402,
            detail={
                "code":        "MOCK_EXAM_LOCKED",
                "message":     "Mock exams require a Pro plan.",
                "upgrade_url": "/billing",
            },
        )
