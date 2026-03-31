from dataclasses import dataclass
from fastapi import HTTPException
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

async def enforce_quota(
    user: User,
    skill: str,
    task_number: int,
    is_mock_test: bool,
    db: AsyncSession,
) -> None:
    """
    Raises HTTP 402 if the user is over-quota.
    Must be called inside the attempt creation transaction.
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

    if is_mock_test and limits.mock_tests is not None:
        used = await repo.count_mock_tests_by_user_skill(user.id, skill)
        if used >= limits.mock_tests:
            raise HTTPException(status_code=402, detail={
                "code": "QUOTA_EXCEEDED",
                "used": used, "limit": limits.mock_tests,
            })

    if not is_mock_test and limits.per_task is not None:
        used = await repo.count_by_user_skill_task(user.id, skill, task_number)
        if used >= limits.per_task:
            raise HTTPException(status_code=402, detail={
                "code": "QUOTA_EXCEEDED",
                "used": used, "limit": limits.per_task,
            })
