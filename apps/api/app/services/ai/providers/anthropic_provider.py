"""
Anthropic provider stub — satisfies the ScoringProvider Protocol.

All methods raise NotImplementedError until a real implementation is needed.
Set AI_SCORING_PROVIDER=anthropic in .env to activate; the factory in
app/core/deps.py will instantiate this class.

Intended model: claude-3-haiku-20240307 (fast + cheap fallback).
"""
from __future__ import annotations

from app.services.ai.base import ScoringResult, TokenUsage


class AnthropicProvider:
    """Anthropic Claude provider — stub only, raises NotImplementedError."""

    async def transcribe(self, audio_bytes: bytes) -> tuple[str, TokenUsage]:
        raise NotImplementedError(
            "Anthropic does not support STT. Use OpenAI provider for speaking tasks."
        )

    async def score_speaking(
        self,
        transcript: str,
        prompt_text: str,
        system_prompt: str,
    ) -> ScoringResult:
        raise NotImplementedError(
            "AnthropicProvider.score_speaking() is not yet implemented. "
            "Set AI_SCORING_PROVIDER=openai in .env to use the OpenAI provider."
        )

    async def score_writing(
        self,
        essay_text: str,
        prompt_text: str,
        system_prompt: str,
    ) -> ScoringResult:
        raise NotImplementedError(
            "AnthropicProvider.score_writing() is not yet implemented. "
            "Set AI_SCORING_PROVIDER=openai in .env to use the OpenAI provider."
        )
