from dataclasses import dataclass
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.repositories.attempt_repo import AttemptRepository
from app.core.config import settings

@dataclass
class PlanLimits:
    per_task: int | None
    mock_tests: int | None

def get_plan_limits(plan: str, skill: str) -> PlanLimits:
    """Return per-task and mock-test limits for the given plan+skill combination."""
    if plan == "starter":
        return PlanLimits(
            per_task=None,
            mock_tests=settings.STARTER_SPEAKING_MOCK_TESTS if skill == "speaking" else settings.STARTER_WRITING_MOCK_TESTS,
        )
    elif plan == "pro":
        return PlanLimits(
            per_task=settings.PRO_SPEAKING_PER_TASK if skill == "speaking" else settings.PRO_WRITING_PER_TASK,
            mock_tests=settings.PRO_SPEAKING_MOCK_TESTS if skill == "speaking" else settings.PRO_WRITING_MOCK_TESTS,
        )
    elif plan == "ultra":
        return PlanLimits(
            per_task=settings.ULTRA_SPEAKING_PER_TASK if skill == "speaking" else settings.ULTRA_WRITING_PER_TASK,
            mock_tests=settings.ULTRA_SPEAKING_MOCK_TESTS if skill == "speaking" else settings.ULTRA_WRITING_MOCK_TESTS,
        )
    return PlanLimits(per_task=None, mock_tests=0)


async def _acquire_user_lock(db: AsyncSession, user_id) -> None:
    """Take a Postgres transaction-scoped advisory lock keyed to this user.

    Guarantees serialization of concurrent quota checks from the same user so
    the ``count → insert`` pattern cannot race two attempts past the limit.
    The lock is released automatically on COMMIT or ROLLBACK.
    """
    # hashtextextended returns a bigint deterministically derived from the string.
    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:uid, 0))"),
        {"uid": str(user_id)},
    )


import uuid as _uuid

async def enforce_quota(
    user: User,
    skill: str,
    task_number: int,
    is_mock_test: bool,
    db: AsyncSession,
    mock_exam_number: int | None = None,
    prompt_id: _uuid.UUID | None = None,
) -> None:
    """
    Raises HTTP 402 if the user is over-quota.
    Must be called inside the attempt creation transaction.

    Regular task practice (non-mock):
    - Retrying ANY prompt the user has already attempted is ALWAYS FREE.
    - Quota only advances when the user attempts a prompt for the FIRST TIME.
    - The per_task limit counts DISTINCT prompts attempted, not total attempts.

    Mock exams:
    - mock_exam_number is the test slot (1, 2, 3 …).
    - Re-doing a slot the user has already started is always allowed (redo = free).
    - Only NEW slots (never started before) count against the limit.

    Concurrency:
    - Acquires a per-user Postgres advisory lock so two concurrent attempts
      cannot both pass the count check and insert past the limit.
    """
    repo = AttemptRepository(db)
    limits = get_plan_limits(user.plan, skill)

    if user.plan == "starter" and not is_mock_test:
        raise HTTPException(
            status_code=402,
            detail={
                "code":        "STARTER_TASK_PRACTICE_LOCKED",
                "message":     "Task practice requires a Pro or Ultra plan.",
                "upgrade_url": "/billing",
            },
        )

    # Serialize against concurrent inserts for this user before we count.
    try:
        await _acquire_user_lock(db, user.id)
    except Exception:
        # Advisory locks are Postgres-only; under SQLite (tests) silently skip.
        pass

    if is_mock_test and limits.mock_tests is not None:
        # ── Slot-aware redo check ─────────────────────────────────────────────
        # If the user has already used this exact slot, let them redo for free.
        if mock_exam_number is not None:
            already_used = await repo.has_used_mock_slot(user.id, skill, mock_exam_number)
            if already_used:
                return  # redo — no quota charge

        # ── New-slot quota check ──────────────────────────────────────────────
        used = await repo.count_distinct_mock_slots(user.id, skill)
        if used >= limits.mock_tests:
            raise HTTPException(status_code=402, detail={
                "code": "QUOTA_EXCEEDED",
                "used": used, "limit": limits.mock_tests,
            })

    if not is_mock_test and limits.per_task is not None:
        # ── Prompt-level redo check ───────────────────────────────────────────
        # If the user has already attempted THIS prompt before, always allow.
        # Unlimited retries on a prompt the user has already started are free.
        if prompt_id is not None:
            already_used = await repo.has_used_prompt(user.id, skill, prompt_id)
            if already_used:
                return  # redo — no quota charge

        # ── New-prompt quota check ────────────────────────────────────────────
        # Count DISTINCT prompts attempted (not total attempts) for this task.
        used = await repo.count_distinct_prompts(user.id, skill, task_number)
        if used >= limits.per_task:
            raise HTTPException(status_code=402, detail={
                "code":    "QUOTA_EXCEEDED",
                "used":    used,
                "limit":   limits.per_task,
                "message": f"You have reached the limit of {limits.per_task} unique prompts for this task. Upgrade to Ultra for more.",
                "upgrade_url": "/billing",
            })


async def enforce_mock_exam_session_quota(
    *,
    user: User,
    session_id: str,
    db: AsyncSession,
) -> None:
    """
    Per-SESSION quota for speaking mock exams.

    One CELPIP speaking mock = 8 audio recordings (tasks 1–8) sharing a
    client-generated ``session_id``. This helper enforces that a new session
    counts against the user's speaking-mock limit and that re-doing an
    already-started session is always free.

    Must be called inside the transaction that inserts the MockExamTaskAttempt.
    """
    from sqlalchemy import func, select
    from app.models.mock_exam_attempt import MockExamTaskAttempt

    limits = get_plan_limits(user.plan, "speaking")
    if limits.mock_tests is None:
        return

    try:
        await _acquire_user_lock(db, user.id)
    except Exception:
        pass

    # Redo check — has the user already uploaded anything for this session?
    row = await db.execute(
        select(func.count(MockExamTaskAttempt.id))
        .where(MockExamTaskAttempt.user_id == user.id)
        .where(MockExamTaskAttempt.session_id == session_id)
        .where(MockExamTaskAttempt.status.not_in(["cancelled"]))
    )
    if (row.scalar_one() or 0) > 0:
        return  # existing session → redo/continuation, no quota charge

    # New session — count distinct existing sessions.
    row = await db.execute(
        select(func.count(func.distinct(MockExamTaskAttempt.session_id)))
        .where(MockExamTaskAttempt.user_id == user.id)
        .where(MockExamTaskAttempt.status.not_in(["cancelled"]))
    )
    used = row.scalar_one() or 0
    if used >= limits.mock_tests:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "QUOTA_EXCEEDED",
                "used": used,
                "limit": limits.mock_tests,
            },
        )
