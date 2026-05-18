"""Quota enforcement — practice attempts + mock exams.

Two gates:
  - enforce_quota                  (practice + writing mocks)
  - enforce_speaking_mock_quota    (speaking mocks; called per-task)

Model
-----
The user has THREE buckets of attempt allowance, consulted in order:

  1. PLAN QUOTA — fixed allowance of NEW prompts per task and NEW mock-test
     slots per skill, granted by the plan tier (starter/pro).

  2. PER-TASK ADD-ON CREDITS — one row per task in addon_credits, written by
     the Stripe webhook when an add-on pack is purchased. Consumed only after
     plan quota is exhausted on a NEW prompt or NEW mock slot.

  3. RETRY CREDIT POOL — single shared balance used to REDO an already-
     attempted prompt or RETAKE a mock. See retry_credit_service. Free plan
     users have an empty pool and are blocked from redoing.

Add-on purchases top up BOTH bucket #2 (new-attempt slots) AND bucket #3
(retry credits) — see the webhook handler. The two buckets serve different
purposes: bucket #2 unlocks more NEW prompts, bucket #3 unlocks REDOES.

Retry-credit costs come from config (see PRACTICE_RETRY_COST,
SPEAKING_MOCK_RETRY_COST, WRITING_MOCK_RETRY_COST). Mock retakes are charged
ONCE per session_id / slot via the ledger idempotency guard, so reloading or
re-entering the same retake mid-mock doesn't double-charge.

System-fault retries (POST /attempts/{id}/retry for status=failed) never
flow through this module — they reuse the existing Attempt row and stay free.
"""
from __future__ import annotations

import uuid as _uuid
import logging

from dataclasses import dataclass
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.mock_exam_repo import MockExamRepository
from app.services import retry_credit_service

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

    The same lock key is reused by retry_credit_service so credit consumes
    and plan-quota checks for one user never overlap.
    """
    try:
        await db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:uid, 0))"),
            {"uid": str(user_id)},
        )
    except Exception:
        # Advisory locks are Postgres-only; silently skip under SQLite in tests.
        pass


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mock_retry_cost(skill: str) -> int:
    """Credit cost to retake one full mock test."""
    return (
        settings.SPEAKING_MOCK_RETRY_COST
        if skill == "speaking"
        else settings.WRITING_MOCK_RETRY_COST
    )


def _plan_quota_exhausted_error(*, used: int, limit: int | None, skill: str) -> HTTPException:
    """The 402 raised when a NEW-attempt request exceeds plan quota.

    The user has retry-credit fallback ONLY for redoing — never for fresh
    prompts they have not attempted before. This keeps "buy retries" distinct
    from "buy more new questions".
    """
    return HTTPException(
        status_code=402,
        detail={
            "code":        "QUOTA_EXCEEDED",
            "used":        used,
            "limit":       limit,
            "message": (
                f"You have used all your {skill} attempts for this task on your "
                "current plan. Upgrade to Pro for more."
            ),
            "upgrade_url": "/billing",
        },
    )


def _mock_plan_exhausted_error(*, used: int, limit: int | None, skill: str) -> HTTPException:
    """The 402 raised when a NEW mock request exceeds plan slot allowance."""
    return HTTPException(
        status_code=402,
        detail={
            "code":        "MOCK_EXAM_LOCKED",
            "used":        used,
            "limit":       limit,
            "message": (
                f"You have used all your {skill} mock test slots on your current "
                "plan. Upgrade to Pro to unlock more mock tests."
            ),
            "upgrade_url": "/billing",
        },
    )


# ── Speaking mock gate (per-task call) ───────────────────────────────────────


async def enforce_speaking_mock_quota(
    *,
    user: User,
    session_id: str,
    db: AsyncSession,
) -> None:
    """Quota gate for speaking mock exam sessions, called per upload-url request.

    Paths:
      1. SAME session_id already started   → free (resume / continue mid-mock)
      2. NEW session_id within plan slots  → free (consumes a plan allowance)
      3. NEW session_id, plan exhausted    → consume one mock_bundle add-on
                                             credit (per-skill pool key)
      4. NEW session_id, no add-ons left   → consume SPEAKING_MOCK_RETRY_COST
                                             from the retry pool, charged ONCE
                                             per session_id via ledger guard

    Mock retakes today start a FRESH session_id, so they hit path 3 or 4.
    Path 1 covers the mid-mock case where the user reloads the browser.
    """
    from app.services.addon_credit_service import consume_credit  # local

    await _acquire_user_lock(db, user.id)

    repo = MockExamRepository(db)
    pool_key = "mock-test-speaking-addon"

    # Path 1 — mid-mock resume.
    if await repo.has_session(user.id, session_id):
        return

    # Path 2 — brand-new session, within plan allocation.
    limits = get_plan_limits(user.plan, "speaking")
    used   = await repo.count_distinct_sessions(user.id)
    if limits.mock_tests is not None and used < limits.mock_tests:
        return

    # Path 3 — plan exhausted → try the mock_bundle add-on pool first. This
    # lets a user who paid for an add-on take more NEW mocks without burning
    # retry credits (which are saved for redoing things they've already done).
    if await consume_credit(user_id=user.id, task_key=pool_key, db=db):
        logger.info(
            "speaking mock: consumed mock_bundle addon credit for user=%s session=%s",
            user.id, session_id,
        )
        return

    # Path 4 — last resort → consume retry credits.
    cost = _mock_retry_cost("speaking")
    await retry_credit_service.consume(
        db,
        user_id=user.id,
        cost=cost,
        reason="speaking_mock_retry",
        source_ref=session_id,
        idempotent_source_ref=True,
    )
    logger.info(
        "speaking mock: charged %d retry credits for user=%s session=%s (past plan + addons)",
        cost, user.id, session_id,
    )


# ── Practice + writing-mock gate ─────────────────────────────────────────────


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

    Practice attempts:
      1. Redo same prompt           → consume PRACTICE_RETRY_COST from pool.
      2. New prompt within plan     → free (count < per_task limit).
      3. New prompt, plan exhausted → consume one per-task AddonCredit.
      4. Neither plan nor add-ons   → 402 QUOTA_EXCEEDED.

    Writing mock attempts (called per task; mock_exam_number identifies the slot):
      1. Same slot already used      → consume mock retry cost ONCE per slot.
      2. New slot within plan        → free.
      3. New slot, plan exhausted    → consume one mock_bundle add-on credit.
      4. Neither plan nor add-ons    → 402 MOCK_EXAM_LOCKED.
    """
    from app.services.addon_credit_service import consume_credit  # local

    repo   = AttemptRepository(db)
    limits = get_plan_limits(user.plan, skill)

    await _acquire_user_lock(db, user.id)

    # ── Mock exam path ──────────────────────────────────────────────────────
    if is_mock_test:
        used = await repo.count_distinct_mock_slots(user.id, skill)

        # Retake guard — slot already used → charge full mock cost once.
        if mock_exam_number is not None:
            already_used = await repo.has_used_mock_slot(user.id, skill, mock_exam_number)
            if already_used:
                slot_ref = f"{skill}_mock:{user.id}:{mock_exam_number}"
                cost = _mock_retry_cost(skill)
                await retry_credit_service.consume(
                    db,
                    user_id=user.id,
                    cost=cost,
                    reason=f"{skill}_mock_retry",
                    source_ref=slot_ref,
                    idempotent_source_ref=True,
                )
                return

        # New slot within plan allocation.
        if limits.mock_tests is not None and used < limits.mock_tests:
            return

        # Plan exhausted on a NEW mock slot → try the mock_bundle add-on pool.
        pool_key = f"mock-test-{skill}-addon"
        if await consume_credit(user_id=user.id, task_key=pool_key, db=db):
            logger.info(
                "enforce_quota: consumed mock_bundle addon credit for user=%s skill=%s",
                user.id, skill,
            )
            return

        # No add-ons either → block. Retry credits don't fund NEW mocks.
        raise _mock_plan_exhausted_error(used=used, limit=limits.mock_tests, skill=skill)

    # ── Practice attempt path ───────────────────────────────────────────────

    # Step 1 — Prompt-level redo: consume from retry pool.
    if prompt_id is not None:
        already_used = await repo.has_used_prompt(user.id, skill, prompt_id)
        if already_used:
            await retry_credit_service.consume(
                db,
                user_id=user.id,
                cost=settings.PRACTICE_RETRY_COST,
                reason="practice_retry",
                source_ref=str(prompt_id),  # ledger trace only; not idempotent
            )
            return

    # Step 2 — Plan quota check (NEW prompt).
    if limits.per_task is not None:
        used = await repo.count_distinct_prompts(user.id, skill, task_number)
        if used < limits.per_task:
            return

    # Step 3 — Plan exhausted on a NEW prompt → try per-task AddonCredit pool.
    task_key = f"{skill}-task-{task_number}"
    if await consume_credit(user_id=user.id, task_key=task_key, db=db):
        logger.info(
            "enforce_quota: consumed addon credit for user=%s task=%s",
            user.id, task_key,
        )
        return

    # Step 4 — Both plan and add-ons exhausted on a NEW prompt → block.
    used = (
        await repo.count_distinct_prompts(user.id, skill, task_number)
        if limits.per_task else 0
    )
    raise _plan_quota_exhausted_error(used=used, limit=limits.per_task, skill=skill)
