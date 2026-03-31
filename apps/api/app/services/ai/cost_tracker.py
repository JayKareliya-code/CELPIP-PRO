"""
AI cost tracker — logs token usage and estimated USD cost to ai_cost_log.

Pricing table is approximate and should be updated as provider pricing changes.
Cost estimates are for observability only — they are never used for billing.
"""
from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_cost_log import AICostLog
from app.services.ai.base import TokenUsage

logger = logging.getLogger(__name__)

# Approximate costs in USD per 1 000 tokens.
# Format: { provider: { model: { "input": float, "output": float } } }
# Whisper pricing is per-minute of audio, approximated here as per-1K tokens
# (Whisper doesn't return token counts — update the Whisper entry if using
# duration-based pricing).
COST_PER_1K: dict[str, dict[str, dict[str, float]]] = {
    "openai": {
        "gpt-4o-mini":   {"input": 0.00015,  "output": 0.00060},
        "gpt-4o":        {"input": 0.00250,  "output": 0.01000},
        "whisper-1":     {"input": 0.00600,  "output": 0.0},   # per-minute estimate
    },
    "anthropic": {
        "claude-3-haiku-20240307": {"input": 0.00025, "output": 0.00125},
    },
    "gemini": {
        "gemini-1.5-flash": {"input": 0.00007, "output": 0.00030},
    },
}


def estimate_cost(provider: str, model: str, usage: TokenUsage) -> float:
    """
    Estimate the USD cost for a single API call.

    Returns 0.0 if the provider/model combination is not in the pricing table
    (prevents a crash from blocking cost logging).
    """
    rates = COST_PER_1K.get(provider, {}).get(model, {})
    if not rates:
        logger.debug("No pricing table entry for provider=%s model=%s", provider, model)
        return 0.0
    return (
        (usage.prompt_tokens / 1_000) * rates.get("input", 0.0)
        + (usage.completion_tokens / 1_000) * rates.get("output", 0.0)
    )


async def log_cost(
    db: AsyncSession,
    attempt_id: UUID,
    provider: str,
    model: str,
    operation: str,
    usage: TokenUsage,
) -> None:
    """
    Persist one token-usage entry to ai_cost_log.

    Args:
        db:         Async SQLAlchemy session (caller handles commit).
        attempt_id: UUID of the parent attempt.
        provider:   "openai" | "anthropic" | "gemini"
        model:      e.g. "gpt-4o-mini", "whisper-1"
        operation:  "stt" | "scoring" | "feedback"
        usage:      TokenUsage from the provider call.
    """
    cost = estimate_cost(provider, model, usage)
    entry = AICostLog(
        attempt_id=attempt_id,
        provider=provider,
        model=model,
        operation=operation,
        prompt_tokens=usage.prompt_tokens,
        completion_tokens=usage.completion_tokens,
        total_tokens=usage.total,
        estimated_cost_usd=cost,
    )
    db.add(entry)
    await db.flush()  # assigns DB id without committing the outer transaction
    logger.debug(
        "Cost logged: attempt=%s op=%s model=%s tokens=%d est=$%.6f",
        attempt_id,
        operation,
        model,
        usage.total,
        cost,
    )
