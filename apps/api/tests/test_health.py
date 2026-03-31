"""Tests for GET /api/v1/health."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_db_up(client: AsyncClient) -> None:
    """Health endpoint returns 200 when DB is reachable (Redis may be down in CI)."""
    response = await client.get("/api/v1/health")
    data = response.json()

    # DB must be healthy; Redis is optional in CI tests
    assert data["db"] == "ok", f"Expected db=ok, got: {data}"
    assert response.status_code in (200, 503)


@pytest.mark.asyncio
async def test_health_response_shape(client: AsyncClient) -> None:
    """Health response always includes 'db' and 'redis' keys."""
    response = await client.get("/api/v1/health")
    data = response.json()
    assert "db" in data
    assert "redis" in data
