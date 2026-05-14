"""Tests for quota enforcement logic.

Covers the current quota model:
  - get_plan_limits: pure mapping of plan + skill → configured limits.
  - enforce_quota: plan quota → addon-credit fallback → HTTP 402, for both the
    practice and mock-exam paths.
"""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.core.config import settings
from app.core.quota import enforce_quota, get_plan_limits
from app.models.user import User


def _make_user(plan: str) -> User:
    user = User()
    user.id = uuid.uuid4()
    user.plan = plan
    user.is_admin = False
    return user


# ── get_plan_limits ───────────────────────────────────────────────────────────
# Pure function over settings — assert against the configured values so the
# tests never drift if the quotas are re-tuned in config / .env.

def test_starter_limits_match_config():
    s = get_plan_limits("starter", "speaking")
    assert s.per_task == settings.STARTER_SPEAKING_PER_TASK
    assert s.mock_tests == settings.STARTER_SPEAKING_MOCK_TESTS

    w = get_plan_limits("starter", "writing")
    assert w.per_task == settings.STARTER_WRITING_PER_TASK
    assert w.mock_tests == settings.STARTER_WRITING_MOCK_TESTS


def test_pro_limits_match_config():
    s = get_plan_limits("pro", "speaking")
    assert s.per_task == settings.PRO_SPEAKING_PER_TASK
    assert s.mock_tests == settings.PRO_SPEAKING_MOCK_TESTS

    w = get_plan_limits("pro", "writing")
    assert w.per_task == settings.PRO_WRITING_PER_TASK
    assert w.mock_tests == settings.PRO_WRITING_MOCK_TESTS


def test_unknown_plan_locks_everything():
    """An unrecognised plan grants zero access (defensive default)."""
    limits = get_plan_limits("nonexistent", "speaking")
    assert limits.per_task is None
    assert limits.mock_tests == 0


# ── enforce_quota — practice path ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_practice_within_plan_quota_is_allowed():
    """A pro user under the per-task limit may start a practice attempt."""
    user = _make_user("pro")
    repo = MagicMock()
    repo.count_distinct_prompts = AsyncMock(return_value=0)  # none used yet

    with patch("app.core.quota.AttemptRepository", return_value=repo):
        # Should NOT raise — within plan allocation.
        await enforce_quota(
            user=user, skill="speaking", task_number=3,
            is_mock_test=False, db=MagicMock(),
        )


@pytest.mark.asyncio
async def test_practice_over_quota_without_credits_raises_402():
    """Pro user at the per-task limit with no addon credits → HTTP 402."""
    user = _make_user("pro")
    repo = MagicMock()
    repo.count_distinct_prompts = AsyncMock(return_value=settings.PRO_SPEAKING_PER_TASK)

    with patch("app.core.quota.AttemptRepository", return_value=repo), \
         patch("app.services.addon_credit_service.consume_credit",
               new=AsyncMock(return_value=False)):
        with pytest.raises(HTTPException) as exc_info:
            await enforce_quota(
                user=user, skill="speaking", task_number=3,
                is_mock_test=False, db=MagicMock(),
            )
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "QUOTA_EXCEEDED"


@pytest.mark.asyncio
async def test_practice_over_quota_with_addon_credit_is_allowed():
    """An addon credit lets a user past the exhausted plan quota."""
    user = _make_user("pro")
    repo = MagicMock()
    repo.count_distinct_prompts = AsyncMock(return_value=settings.PRO_SPEAKING_PER_TASK)

    with patch("app.core.quota.AttemptRepository", return_value=repo), \
         patch("app.services.addon_credit_service.consume_credit",
               new=AsyncMock(return_value=True)):
        # Credit consumed → must not raise.
        await enforce_quota(
            user=user, skill="speaking", task_number=3,
            is_mock_test=False, db=MagicMock(),
        )


# ── enforce_quota — mock-exam path ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mock_within_plan_quota_is_allowed():
    """A pro user under the mock-test limit may start a mock exam."""
    user = _make_user("pro")
    repo = MagicMock()
    repo.count_distinct_mock_slots = AsyncMock(return_value=0)

    with patch("app.core.quota.AttemptRepository", return_value=repo):
        # Should NOT raise — within plan mock allocation.
        await enforce_quota(
            user=user, skill="speaking", task_number=0,
            is_mock_test=True, db=MagicMock(),
        )


@pytest.mark.asyncio
async def test_mock_over_quota_without_credits_raises_402():
    """Pro user at the mock-test limit with no addon credits → HTTP 402."""
    user = _make_user("pro")
    repo = MagicMock()
    repo.count_distinct_mock_slots = AsyncMock(return_value=settings.PRO_SPEAKING_MOCK_TESTS)

    with patch("app.core.quota.AttemptRepository", return_value=repo), \
         patch("app.services.addon_credit_service.consume_credit",
               new=AsyncMock(return_value=False)):
        with pytest.raises(HTTPException) as exc_info:
            await enforce_quota(
                user=user, skill="speaking", task_number=0,
                is_mock_test=True, db=MagicMock(),
            )
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "QUOTA_EXCEEDED"
