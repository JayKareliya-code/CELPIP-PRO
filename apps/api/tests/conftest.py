"""Pytest fixtures shared across all test modules."""
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import create_app
from app.core.deps import get_db
from app.models.base import Base

# Use an in-memory SQLite database for tests (asyncpg → aiosqlite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Single asyncio loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    """Create all tables in the test SQLite DB once per session."""
    test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield test_engine
    await test_engine.dispose()


@pytest_asyncio.fixture()
async def db_session(engine) -> AsyncSession:
    """Yield a transactional session that rolls back after each test."""
    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture()
async def client(db_session: AsyncSession) -> AsyncClient:
    """Async test client with the DB dependency overridden."""
    app = create_app()

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


# ── Auth helpers ─────────────────────────────────────────────────────────────

def auth_headers(clerk_id: str = "user_test_001") -> dict[str, str]:
    """Return Authorization header using the dev test-token bypass."""
    return {"Authorization": f"Bearer test_token_{clerk_id}"}


def admin_headers(clerk_id: str = "admin_test_001") -> dict[str, str]:
    """Return auth headers for an admin user.

    The admin flag must be set manually in the test after the user row is created.
    """
    return {"Authorization": f"Bearer test_token_{clerk_id}"}
