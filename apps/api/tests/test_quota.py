"""Tests for quota enforcement logic."""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from app.core.quota import enforce_quota, get_plan_limits, PlanLimits
from app.models.user import User


def _make_user(plan: str) -> User:
    user = User()
    user.id = uuid.uuid4()
    user.plan = plan
    user.is_admin = False
    return user


# ── get_plan_limits ───────────────────────────────────────────────────────────

def test_starter_speaking_limits():
    limits = get_plan_limits("starter", "speaking")
    assert limits.per_task is None          # task practice locked
    assert limits.mock_tests == 1


def test_starter_writing_limits():
    limits = get_plan_limits("starter", "writing")
    assert limits.per_task is None
    assert limits.mock_tests == 1


def test_pro_speaking_limits():
    limits = get_plan_limits("pro", "speaking")
    assert limits.per_task == 5
    assert limits.mock_tests == 2


def test_ultra_writing_limits():
    limits = get_plan_limits("ultra", "writing")
    assert limits.per_task == 15
    assert limits.mock_tests == 5


# ── enforce_quota ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_starter_task_practice_blocked():
    """Starter users cannot do per-task practice — expect HTTP 402."""
    user = _make_user("starter")
    db = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        await enforce_quota(
            user=user, skill="speaking", task_number=1,
            is_mock_test=False, db=db,
        )
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "STARTER_TASK_PRACTICE_LOCKED"


@pytest.mark.asyncio
async def test_starter_mock_test_allowed_when_under_limit():
    """Starter users can do a mock test when under the 1-test limit."""
    user = _make_user("starter")

    mock_repo = MagicMock()
    mock_repo.count_mock_tests_by_user_skill = AsyncMock(return_value=0)

    db = MagicMock()

    # Patch the AttemptRepository constructor inside quota module
    import app.core.quota as quota_module
    original = quota_module.AttemptRepository

    class FakeRepo:
        def __init__(self, session):
            pass
        count_mock_tests_by_user_skill = mock_repo.count_mock_tests_by_user_skill

    quota_module.AttemptRepository = FakeRepo
    try:
        # Should NOT raise
        await enforce_quota(
            user=user, skill="speaking", task_number=0,
            is_mock_test=True, db=db,
        )
    finally:
        quota_module.AttemptRepository = original


@pytest.mark.asyncio
async def test_starter_mock_test_blocked_when_at_limit():
    """Starter users get 402 when they've used their 1 mock test."""
    user = _make_user("starter")

    import app.core.quota as quota_module
    original = quota_module.AttemptRepository

    class FakeRepo:
        def __init__(self, session):
            pass
        async def count_mock_tests_by_user_skill(self, *args):
            return 1  # already used the single mock test

    quota_module.AttemptRepository = FakeRepo
    try:
        with pytest.raises(HTTPException) as exc_info:
            await enforce_quota(
                user=user, skill="speaking", task_number=0,
                is_mock_test=True, db=MagicMock(),
            )
        assert exc_info.value.status_code == 402
        assert exc_info.value.detail["code"] == "QUOTA_EXCEEDED"
    finally:
        quota_module.AttemptRepository = original


@pytest.mark.asyncio
async def test_pro_per_task_blocked_when_at_limit():
    """Pro user gets 402 when per-task quota is exhausted."""
    user = _make_user("pro")

    import app.core.quota as quota_module
    original = quota_module.AttemptRepository

    class FakeRepo:
        def __init__(self, session):
            pass
        async def count_by_user_skill_task(self, *args):
            return 5  # at the pro limit of 5

    quota_module.AttemptRepository = FakeRepo
    try:
        with pytest.raises(HTTPException) as exc_info:
            await enforce_quota(
                user=user, skill="speaking", task_number=3,
                is_mock_test=False, db=MagicMock(),
            )
        assert exc_info.value.status_code == 402
    finally:
        quota_module.AttemptRepository = original
