"""
Provider Protocol + core data contracts for the AI scoring layer.

All AI providers (OpenAI, Anthropic, Gemini) must satisfy the ScoringProvider
Protocol.  This file defines only data shapes and the Protocol — zero I/O.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


# ── Token Usage ──────────────────────────────────────────────────────────────

@dataclass
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0

    @property
    def total(self) -> int:
        return self.prompt_tokens + self.completion_tokens


# ── Rich feedback item types ──────────────────────────────────────────────────

@dataclass
class FeedbackItem:
    """A single strength or weakness entry with evidence from the transcript."""
    label: str              # Dimension name: "Vocabulary Range", "Fluency & Pronunciation"
    observation: str        # What was done well / what the gap is
    quote: str              # 3–8 words verbatim from the candidate's transcript
    fix: str = ""           # Weaknesses only: one concrete substitution / action


@dataclass
class ImprovementTip:
    """An actionable coaching tip with a drill and concrete example."""
    title: str              # Short label: "Reduce Filler Words"
    why: str                # Why this hurts the band score
    how: str                # The practice drill / technique
    example: str            # One concrete before/after phrase


# ── Scoring Result ────────────────────────────────────────────────────────────

@dataclass
class ScoringResult:
    """Unified result returned by every scoring provider."""

    # Speaking dimensions (1–12 each)
    task_completion: int = 0
    coherence: int = 0
    vocabulary: int = 0
    fluency: int = 0
    grammar: int = 0

    # Writing dimensions (1–12 each)
    task_fulfillment: int = 0
    organization: int = 0
    tone_register: int = 0

    # Shared fields
    estimated_band: float = 0.0

    # Rich structured feedback (speaking — new format)
    strengths: list[FeedbackItem] = field(default_factory=list)
    weaknesses: list[FeedbackItem] = field(default_factory=list)
    improvement_tips: list[ImprovementTip] = field(default_factory=list)
    sample_response: str = ""

    # Per-dimension explanatory commentary (one sentence each)
    dimension_commentary: dict[str, str] = field(default_factory=dict)

    # Single sentence: what specific skill jump would move the user up 0.5 bands
    next_milestone: str = ""

    # Raw JSON from the model (stored for debugging / re-scoring without re-calling)
    raw_json: dict = field(default_factory=dict)

    # Token cost metadata
    usage: TokenUsage = field(default_factory=TokenUsage)


# ── Provider Protocol ─────────────────────────────────────────────────────────

@runtime_checkable
class ScoringProvider(Protocol):
    """
    All AI providers must implement this interface.

    Provider swap requires ONLY a config value change — no code changes.
    """

    async def transcribe(self, audio_bytes: bytes) -> tuple[str, TokenUsage]:
        """
        Speech-to-text — speaking attempts only.

        Args:
            audio_bytes: Raw audio content (webm/mp4/wav).

        Returns:
            (transcript_text, token_usage)
        """
        ...

    async def score_speaking(
        self,
        transcript: str,
        prompt_text: str,
        system_prompt: str,
        context_image_url: str | None = None,
    ) -> ScoringResult:
        """
        Score a speaking transcript against the CELPIP rubric.

        Args:
            transcript:         STT output text.
            prompt_text:        The original speaking prompt shown to the candidate.
            system_prompt:      Fully assembled rubric system prompt (with band
                                descriptors + calibration examples injected).
            context_image_url:  Public URL of the scene image shown to the candidate
                                during the task (Tasks 3, 4, 8).  None for text-only
                                tasks.  Providers that support vision will include
                                the image in the scoring request for better accuracy.

        Returns:
            ScoringResult with all 5 speaking dimensions populated.
        """
        ...

    async def score_writing(
        self,
        essay_text: str,
        prompt_text: str,
        system_prompt: str,
    ) -> ScoringResult:
        """
        Score a written essay against the CELPIP rubric.

        Args:
            essay_text:    Candidate's submitted essay.
            prompt_text:   The original writing prompt.
            system_prompt: Fully assembled rubric system prompt.

        Returns:
            ScoringResult with all 3 writing dimensions populated.
        """
        ...
