"""
Gemini provider stub — satisfies the ScoringProvider Protocol.

All methods raise NotImplementedError until a real implementation is needed.
Set AI_SCORING_PROVIDER=gemini in .env to activate; the factory in
app/core/deps.py will instantiate this class.

Intended model: gemini-1.5-flash (ultra-low cost option).
"""
from __future__ import annotations

from app.services.ai.base import ScoringResult, TokenUsage


class GeminiProvider:
    """Google Gemini provider — stub only, raises NotImplementedError."""

    async def transcribe(self, audio_bytes: bytes) -> tuple[str, TokenUsage]:
        raise NotImplementedError(
            "GeminiProvider.transcribe() is not yet implemented. "
            "Set AI_STT_PROVIDER=openai in .env to use Whisper for STT."
        )

    async def score_speaking(
        self,
        transcript: str,
        prompt_text: str,
        system_prompt: str,
    ) -> ScoringResult:
        raise NotImplementedError(
            "GeminiProvider.score_speaking() is not yet implemented. "
            "Set AI_SCORING_PROVIDER=openai in .env to use the OpenAI provider."
        )

    async def score_writing(
        self,
        essay_text: str,
        prompt_text: str,
        system_prompt: str,
    ) -> ScoringResult:
        raise NotImplementedError(
            "GeminiProvider.score_writing() is not yet implemented. "
            "Set AI_SCORING_PROVIDER=openai in .env to use the OpenAI provider."
        )
