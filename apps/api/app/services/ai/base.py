"""
Provider Protocol + core data contracts for the AI scoring layer.

All AI providers (OpenAI, Anthropic, Gemini) must satisfy the ScoringProvider
Protocol.  This file defines only data shapes and the Protocol — zero I/O.

Schema versions:
  v1 (legacy): 5-dimension model — task_completion/coherence/fluency/grammar for
               speaking; task_fulfillment/organization/tone_register/grammar for writing.
  v2 (current): Official CELPIP 4-dimension model — content_coherence/vocabulary/
                listenability/task_fulfillment for speaking;
                content_coherence/vocabulary/readability/task_fulfillment for writing.
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
    label: str              # Dimension name: "content_coherence", "vocabulary", etc.
    observation: str        # What was done well / what the gap is
    quote: str              # Verbatim words from the candidate's transcript/essay
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
    """Unified result returned by every scoring provider.

    Schema v2 (current — 4 official CELPIP dimensions):
      Speaking:  content_coherence, vocabulary, listenability, task_fulfillment
      Writing:   content_coherence, vocabulary, readability, task_fulfillment

    Schema v1 (legacy — kept for backward compatibility with old score_reports rows):
      Speaking:  task_completion, coherence, fluency, grammar + vocabulary
      Writing:   task_fulfillment, organization, tone_register, grammar + vocabulary

    The pipeline sets schema_version=2 for all new attempts.  Old attempts stored
    in the DB retain their v1 dimension rows and are identified by schema_version=1
    on the score_reports row.
    """

    # ── Schema v2: official CELPIP 4-dimension model (speaking) ──────────────
    content_coherence: int = 0     # Speaking: Content/Coherence (§4.1)
    listenability: int = 0         # Speaking: Listenability (§4.3)

    # ── Schema v2: official CELPIP 4-dimension model (writing) ───────────────
    readability: int = 0           # Writing: Readability (§5.3)

    # ── Shared dimensions (used in both speaking and writing v2) ─────────────
    vocabulary: int = 0            # Vocabulary (§4.2 / §5.2)
    task_fulfillment: int = 0      # Task Fulfillment (§4.4 / §5.4)

    # ── Schema v1 legacy dimensions (deprecated — do not use in new code) ────
    # Speaking v1
    task_completion: int = 0       # Deprecated: use task_fulfillment
    coherence: int = 0             # Deprecated: use content_coherence
    fluency: int = 0               # Deprecated: use listenability
    grammar: int = 0               # Deprecated: merged into listenability/readability
    # Writing v1
    organization: int = 0          # Deprecated: use content_coherence
    tone_register: int = 0         # Deprecated: merged into readability

    # ── Shared output fields ──────────────────────────────────────────────────
    estimated_band: float = 0.0

    # Band range string: e.g. "7-8" or "9-10" (§9 official output format)
    likely_range: str = ""

    # Rich structured feedback
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
            ScoringResult with schema v2 speaking dimensions populated.
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
            ScoringResult with schema v2 writing dimensions populated.
        """
        ...
