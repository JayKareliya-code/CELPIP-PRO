from typing import AsyncGenerator
from functools import lru_cache
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

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


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a transactional database session; rolls back on exception."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
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
