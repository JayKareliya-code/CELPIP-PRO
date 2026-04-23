from typing import AsyncGenerator
from functools import lru_cache
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

# ── Primary (read-write) engine ───────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_size=10,
    max_overflow=20,
)

async_session_maker = async_sessionmaker(
    engine, expire_on_commit=False, autoflush=False
)

# ── Read-replica engine (S2-8) ────────────────────────────────────────────────
# When DATABASE_READ_URL is set, read-only routes use this engine.
# Falls back to the primary engine when empty (dev / single-node).
_read_url = settings.DATABASE_READ_URL or settings.DATABASE_URL
read_engine = create_async_engine(
    _read_url,
    echo=False,         # never echo read queries — too noisy
    future=True,
    pool_size=10,
    max_overflow=20,
)

read_session_maker = async_sessionmaker(
    read_engine, expire_on_commit=False, autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a transactional (read-write) database session; rolls back on exception."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_read_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield a read-only database session from the read-replica engine.

    Uses the replica URL when DATABASE_READ_URL is configured; falls back to
    the primary engine in development / single-node deployments.

    IMPORTANT: Never issue writes (INSERT/UPDATE/DELETE) through this session.
    On Aurora/RDS read replicas, write attempts raise an error at the DB level.
    """
    async with read_session_maker() as session:
        try:
            yield session
            # no commit — read sessions never write
        except Exception:
            await session.rollback()
            raise



@lru_cache(maxsize=1)
def get_redis_pool() -> aioredis.Redis:
    """Return a shared async Redis client (cached for the process lifetime)."""
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


# ── AI Provider Factory ───────────────────────────────────────────────────────

def get_scoring_provider():
    """
    Return the configured AI scoring provider instance.

    Hot-swappable: changing AI_SCORING_PROVIDER in .env selects the provider
    without any code changes. All providers satisfy the ScoringProvider Protocol.

    Usage as a FastAPI dependency:
        provider = Depends(get_scoring_provider)
    """
    from app.services.ai.base import ScoringProvider  # local import avoids circular deps
    from app.services.ai.providers.openai_provider import OpenAIProvider
    from app.services.ai.providers.anthropic_provider import AnthropicProvider
    from app.services.ai.providers.gemini_provider import GeminiProvider

    provider_map = {
        "openai":    OpenAIProvider,
        "anthropic": AnthropicProvider,
        "gemini":    GeminiProvider,
    }
    provider_cls = provider_map.get(settings.AI_SCORING_PROVIDER)
    if provider_cls is None:
        raise ValueError(
            f"Unknown AI_SCORING_PROVIDER: '{settings.AI_SCORING_PROVIDER}'. "
            f"Valid values: {list(provider_map.keys())}"
        )
    return provider_cls()
