"""Tests for speaking task listing and attempt lifecycle."""
import uuid
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient

from app.core.config import settings
from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_list_speaking_tasks_requires_auth(client: AsyncClient) -> None:
    """Speaking task listing returns 403 if no auth header is provided."""
    response = await client.get("/api/v1/speaking/tasks")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_speaking_tasks_empty(client: AsyncClient) -> None:
    """Returns an empty list when no prompts exist in the DB."""
    response = await client.get(
        "/api/v1/speaking/tasks", headers=auth_headers()
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_speaking_task_not_found(client: AsyncClient) -> None:
    """Single-task detail returns 404 for a task that has no active prompt."""
    response = await client.get(
        "/api/v1/speaking/tasks/99", headers=auth_headers()
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_start_speaking_attempt_missing_prompt(client: AsyncClient) -> None:
    """Starting an attempt with a non-existent prompt_id returns 404."""
    response = await client.post(
        "/api/v1/speaking/attempts/start",
        json={"prompt_id": str(uuid.uuid4()), "is_mock_test": False},
        headers=auth_headers(),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_start_speaking_attempt_starter_first_attempt(
    client: AsyncClient,
) -> None:
    """A starter user's first task-practice attempt is governed by the plan's
    per-task allocation: allowed (201) when STARTER_SPEAKING_PER_TASK > 0,
    otherwise blocked with HTTP 402 QUOTA_EXCEEDED."""
    # Patch the repo to return a fake prompt so the quota check is reached.
    fake_prompt_id = uuid.uuid4()

    with patch(
        "app.repositories.prompt_repo.SpeakingPromptRepository.get_by_id",
        new_callable=AsyncMock,
    ) as mock_get:
        mock_prompt = type("P", (), {"task_number": 1, "id": fake_prompt_id})()
        mock_get.return_value = mock_prompt

        response = await client.post(
            "/api/v1/speaking/attempts/start",
            json={"prompt_id": str(fake_prompt_id), "is_mock_test": False},
            headers=auth_headers("starter_user"),
        )

    if settings.STARTER_SPEAKING_PER_TASK:
        assert response.status_code == 201
        assert response.json()["status"] == "pending"
    else:
        assert response.status_code == 402
        assert response.json()["detail"]["code"] == "QUOTA_EXCEEDED"
