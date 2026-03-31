"""Tests for writing task listing and attempt lifecycle."""
import uuid
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_list_writing_tasks_requires_auth(client: AsyncClient) -> None:
    """Writing task listing returns 401/403 without an auth token."""
    response = await client.get("/api/v1/writing/tasks")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_writing_tasks_empty(client: AsyncClient) -> None:
    """Returns an empty list when no writing prompts exist in the DB."""
    response = await client.get(
        "/api/v1/writing/tasks", headers=auth_headers()
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_writing_task_not_found(client: AsyncClient) -> None:
    """Single task detail returns 404 when no active prompt exists."""
    response = await client.get(
        "/api/v1/writing/tasks/1", headers=auth_headers()
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_submit_writing_attempt_not_found(client: AsyncClient) -> None:
    """Submit to a non-existent attempt returns 404."""
    response = await client.post(
        f"/api/v1/writing/attempts/{uuid.uuid4()}/submit",
        json={"essay_text": "Hello world.", "auto_submitted": False},
        headers=auth_headers(),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_attempt_status_not_found(client: AsyncClient) -> None:
    """Status poll for a non-existent attempt returns 404."""
    response = await client.get(
        f"/api/v1/attempts/{uuid.uuid4()}/status",
        headers=auth_headers(),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_history_empty(client: AsyncClient) -> None:
    """History returns an empty paginated response for a fresh user."""
    response = await client.get(
        "/api/v1/history",
        headers=auth_headers("history_user"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1
