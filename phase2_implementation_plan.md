# Phase 2 — AI Scoring Pipeline & Reports
### FastAPI · Celery · OpenAI Whisper · GPT-4o-mini · Next.js 14 · CELPIP Rubric Engine

**Duration:** 3 weeks (Weeks 4–6)
**Goal:** Replace the Celery stub workers with a real AI pipeline. Every submitted attempt is transcribed (speaking), rubric-scored, and surfaced as a full feedback report in the UI. History page becomes functional.

---

## Senior Engineer's Framing

Phase 1 gave us the pipe. Phase 2 fills it with intelligence. The three non-negotiable constraints as I approach this phase:

1. **Never break the Phase 1 contract.** The `POST /speaking/attempts/{id}/submit-audio` and `POST /writing/attempts/{id}/submit` endpoints do not change their request shapes. The Celery task signature does not change. We only replace the stub bodies.
2. **Provider abstraction is load-bearing, not aspirational.** By the time Phase 2 ships, swapping from OpenAI to Gemini must require zero code changes — only a config value.
3. **Cost is observable from day one.** Token usage is logged per-attempt. If scoring costs $0.08/attempt we will know it on day one of production traffic.

---

## What Phase 1 Left for Us

| Asset | Status | Phase 2 Action |
|---|---|---|
| `workers/speaking_tasks.py` | Stub: sleeps 5s, sets status=complete | Replace body with real pipeline |
| `workers/writing_tasks.py` | Stub: same | Replace body with real pipeline |
| `score_reports` table | Created in Alembic | Populate for real |
| `score_dimensions` table | Created in Alembic | Populate for real |
| `transcripts` table | Created in Alembic | Populate for real |
| `feedback_reports` table | Created in Alembic | Populate for real |
| `/attempts/[id]/report` page | `ReportPlaceholder.tsx` stub | Build full report UI |
| `/history` page | `PlaceholderPage.tsx` | Build full history UI |
| `calibration_samples` table | Admin UI + seed data exist | Wire into scoring prompt |

---

## New Database Additions (Alembic migration `0002`)

The Phase 1 schema already has the right tables. We add indexes for the access patterns Phase 2 introduces.

```sql
-- Migration 0002: indexes + ai_cost_log table

-- Fast lookup of all reports for a user (history page)
CREATE INDEX idx_attempts_user_created ON attempts(user_id, created_at DESC);

-- Fast lookup of dimensions for a report (report page breakdown)
CREATE INDEX idx_score_dimensions_report ON score_dimensions(report_id);

-- Token cost tracking table (new — Phase 2 addition)
CREATE TABLE ai_cost_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id    UUID REFERENCES attempts(id) ON DELETE CASCADE,
    provider      TEXT NOT NULL,         -- 'openai' | 'anthropic' | 'gemini'
    model         TEXT NOT NULL,         -- 'gpt-4o-mini', 'whisper-1', etc.
    operation     TEXT NOT NULL,         -- 'stt' | 'scoring' | 'feedback'
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    total_tokens  INT NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10,6),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_cost_attempt ON ai_cost_log(attempt_id);
CREATE INDEX idx_ai_cost_created ON ai_cost_log(created_at DESC);
```

---

## Full File Structure — Phase 2 Additions Only

New files marked `[NEW]`. Modified Phase 1 files marked `[MODIFIED]`.

```text
apps/api/
├── alembic/versions/
│   └── 0002_ai_indexes_cost_log.py           [NEW]
│
├── app/
│   ├── api/v1/
│   │   ├── reports.py                        [NEW]  ← GET /attempts/{id}/report
│   │   └── history.py                        [NEW]  ← GET /history (paginated)
│   │
│   ├── models/
│   │   └── ai_cost_log.py                    [NEW]  ← SQLAlchemy model
│   │
│   ├── schemas/
│   │   ├── report.py                         [NEW]  ← ReportResponse, DimensionScore, FeedbackBlock
│   │   └── history.py                        [NEW]  ← HistoryItem, PaginatedHistory
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── __init__.py                   [NEW]
│   │   │   ├── base.py                       [NEW]  ← ScoringProvider Protocol + ScoringResult dataclass
│   │   │   ├── providers/
│   │   │   │   ├── __init__.py               [NEW]
│   │   │   │   ├── openai_provider.py        [NEW]  ← OpenAI Whisper + GPT-4o-mini
│   │   │   │   ├── anthropic_provider.py     [NEW]  ← Claude Haiku fallback stub
│   │   │   │   └── gemini_provider.py        [NEW]  ← Gemini Flash stub
│   │   │   ├── rubric/
│   │   │   │   ├── __init__.py               [NEW]
│   │   │   │   ├── speaking_rubric.py        [NEW]  ← System prompt + schema for speaking
│   │   │   │   ├── writing_rubric.py         [NEW]  ← System prompt + schema for writing
│   │   │   │   └── band_descriptors.py       [NEW]  ← CELPIP band level text for all 12 bands
│   │   │   ├── calibration.py                [NEW]  ← Fetch + format calibration samples into prompt
│   │   │   └── cost_tracker.py               [NEW]  ← Log token usage to ai_cost_log
│   │   │
│   │   ├── report_service.py                 [NEW]  ← Fetch full report for API response
│   │   └── history_service.py                [NEW]  ← Paginated attempt history
│   │
│   └── workers/
│       ├── speaking_tasks.py                 [MODIFIED]  ← Replace stub with real pipeline
│       └── writing_tasks.py                  [MODIFIED]  ← Replace stub with real pipeline
│
apps/web/
├── app/
│   ├── attempts/[id]/
│   │   └── report/page.tsx                   [MODIFIED]  ← Replace ReportPlaceholder with full UI
│   └── history/page.tsx                      [MODIFIED]  ← Replace PlaceholderPage with full UI
│
├── components/
│   ├── report/
│   │   ├── ReportPage.tsx                    [NEW]  ← Top-level report shell
│   │   ├── ScoreSummaryCard.tsx              [NEW]  ← Band score + visual gauge
│   │   ├── DimensionBreakdown.tsx            [NEW]  ← Progress bars per rubric dimension
│   │   ├── StrengthsPanel.tsx                [NEW]  ← Green pill chips
│   │   ├── WeaknessesPanel.tsx               [NEW]  ← Orange pill chips
│   │   ├── ImprovementTipsAccordion.tsx      [NEW]  ← shadcn/ui Accordion
│   │   ├── SampleResponseCard.tsx            [NEW]  ← Collapsible high-band sample
│   │   └── TranscriptCard.tsx                [NEW]  ← Speaking only, highlighted text
│   │
│   ├── history/
│   │   ├── HistoryPage.tsx                   [NEW]  ← Shell + filter bar + table
│   │   ├── HistoryFilterBar.tsx              [NEW]  ← Skill filter + date range picker
│   │   └── HistoryTable.tsx                  [NEW]  ← Paginated table (reuses AttemptHistoryTable base)
│   │
│   └── attempts/
│       └── AttemptStatusCard.tsx             [MODIFIED]  ← Add "View Report" button on complete
│
└── lib/
    └── hooks/
        ├── useReport.ts                      [NEW]  ← TanStack Query: fetch full report
        └── useHistory.ts                     [NEW]  ← TanStack Query: paginated history
```

---

## Week-by-Week Breakdown

| Week | Focus | Exit Criteria |
|---|---|---|
| **Week 4** | AI provider abstraction, rubric prompts, STT pipeline (speaking) | Submit speaking audio → transcript saved in DB within 30s |
| **Week 5** | LLM scoring (both skills), feedback generation, all DB tables populated | Full score report (band + 5 dimensions + tips) persisted for every attempt |
| **Week 6** | Report UI, history page, error handling, retry logic, cost logging | Report page renders in browser; history is paginated and filterable; CI passes |

---

## Step-by-Step Implementation

---

### Step 1 — Provider Protocol + Base Contracts

Everything else in Phase 2 depends on this being right. Get it right first.

**`app/services/ai/base.py`**
```python
from __future__ import annotations
from typing import Protocol, runtime_checkable
from dataclasses import dataclass, field
from pydantic import BaseModel


@dataclass
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0

    @property
    def total(self) -> int:
        return self.prompt_tokens + self.completion_tokens


@dataclass
class ScoringResult:
    # Speaking dimensions
    task_completion: int = 0
    coherence: int = 0
    vocabulary: int = 0
    fluency: int = 0
    grammar: int = 0
    # Writing dimensions
    task_fulfillment: int = 0
    organization: int = 0
    tone_register: int = 0
    # Shared
    estimated_band: float = 0.0
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    improvement_tips: list[str] = field(default_factory=list)
    sample_response: str = ""
    raw_json: dict = field(default_factory=dict)
    usage: TokenUsage = field(default_factory=TokenUsage)


@runtime_checkable
class ScoringProvider(Protocol):
    """All AI providers must implement this interface."""

    async def transcribe(self, audio_bytes: bytes) -> tuple[str, TokenUsage]:
        """STT — speaking only. Returns (transcript_text, usage)."""
        ...

    async def score_speaking(
        self, transcript: str, prompt_text: str, system_prompt: str
    ) -> ScoringResult:
        """Score a speaking transcript against the CELPIP rubric."""
        ...

    async def score_writing(
        self, essay_text: str, prompt_text: str, system_prompt: str
    ) -> ScoringResult:
        """Score a written essay against the CELPIP rubric."""
        ...
```

**`app/services/ai/providers/openai_provider.py`**
```python
import httpx
import json
from tenacity import retry, stop_after_attempt, wait_exponential
from app.services.ai.base import ScoringProvider, ScoringResult, TokenUsage
from app.core.config import settings

# Structured output JSON schema enforced via OpenAI function calling
SCORING_SCHEMA = {
    "name": "celpip_score",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "task_completion":    {"type": "integer", "minimum": 1, "maximum": 12},
            "coherence":          {"type": "integer", "minimum": 1, "maximum": 12},
            "vocabulary":         {"type": "integer", "minimum": 1, "maximum": 12},
            "fluency":            {"type": "integer", "minimum": 1, "maximum": 12},
            "grammar":            {"type": "integer", "minimum": 1, "maximum": 12},
            "estimated_band":     {"type": "number",  "minimum": 1, "maximum": 12},
            "strengths":          {"type": "array",   "items": {"type": "string"}, "maxItems": 4},
            "weaknesses":         {"type": "array",   "items": {"type": "string"}, "maxItems": 4},
            "improvement_tips":   {"type": "array",   "items": {"type": "string"}, "maxItems": 5},
            "sample_response":    {"type": "string"},
        },
        "required": [
            "task_completion","coherence","vocabulary","fluency","grammar",
            "estimated_band","strengths","weaknesses","improvement_tips","sample_response"
        ],
        "additionalProperties": False,
    },
}


class OpenAIProvider:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url="https://api.openai.com/v1",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            timeout=90.0,
        )
        self._scoring_model = settings.ai_scoring_model       # "gpt-4o-mini"
        self._stt_model = settings.ai_stt_model               # "whisper-1"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def transcribe(self, audio_bytes: bytes) -> tuple[str, TokenUsage]:
        """Whisper STT — multipart form upload."""
        files = {"file": ("audio.webm", audio_bytes, "audio/webm")}
        data  = {"model": self._stt_model, "response_format": "verbose_json"}
        resp  = await self._client.post("/audio/transcriptions", files=files, data=data)
        resp.raise_for_status()
        body = resp.json()
        # Whisper does not report token usage; estimate from duration
        return body["text"], TokenUsage(prompt_tokens=0, completion_tokens=0)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def score_speaking(
        self, transcript: str, prompt_text: str, system_prompt: str
    ) -> ScoringResult:
        payload = {
            "model": self._scoring_model,
            "response_format": {"type": "json_schema", "json_schema": SCORING_SCHEMA},
            "messages": [
                {"role": "system",  "content": system_prompt},
                {"role": "user",    "content": f"PROMPT:\n{prompt_text}\n\nTRANSCRIPT:\n{transcript}"},
            ],
        }
        resp = await self._client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        body   = resp.json()
        raw    = json.loads(body["choices"][0]["message"]["content"])
        usage  = TokenUsage(
            prompt_tokens=body["usage"]["prompt_tokens"],
            completion_tokens=body["usage"]["completion_tokens"],
        )
        return ScoringResult(**{k: raw[k] for k in raw}, raw_json=raw, usage=usage)

    async def score_writing(
        self, essay_text: str, prompt_text: str, system_prompt: str
    ) -> ScoringResult:
        # Reuses same structured-output path; writing schema swaps fluency/fluency fields
        payload = {
            "model": self._scoring_model,
            "response_format": {"type": "json_schema", "json_schema": _writing_schema()},
            "messages": [
                {"role": "system",  "content": system_prompt},
                {"role": "user",    "content": f"PROMPT:\n{prompt_text}\n\nESSAY:\n{essay_text}"},
            ],
        }
        resp = await self._client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        body  = resp.json()
        raw   = json.loads(body["choices"][0]["message"]["content"])
        usage = TokenUsage(
            prompt_tokens=body["usage"]["prompt_tokens"],
            completion_tokens=body["usage"]["completion_tokens"],
        )
        return ScoringResult(**{k: raw[k] for k in raw}, raw_json=raw, usage=usage)
```

---

### Step 2 — Rubric Prompts + Band Descriptors

**`app/services/ai/rubric/band_descriptors.py`**

This is the most sensitive engineering artifact in Phase 2. It defines the CELPIP band scale text injected into every scoring prompt. If this is wrong, all scores drift.

```python
# CELPIP Speaking Band Descriptors (1–12)
# Source: CELPIP official band descriptors, adapted for LLM consumption.
# Keep this up to date as CELPIP revises its rubric.

SPEAKING_BAND_DESCRIPTORS: dict[int, str] = {
    12: "Communicates all ideas clearly; exemplary task completion; highly coherent organization; "
        "wide vocabulary range used precisely; fluent with no unnatural pauses; near-native grammar.",
    10: "Communicates ideas very clearly; strong task completion; well-organized; broad vocabulary; "
        "generally fluent with minor self-corrections; very few grammar errors.",
    8:  "Communicates ideas clearly; task mostly complete; generally organized; adequate vocabulary; "
        "some pauses and minor errors; grammar mostly accurate.",
    6:  "Some ideas communicated; partial task completion; some organization issues; limited vocabulary "
        "with some repetition; noticeable pauses; several grammar errors.",
    4:  "Limited communication; task mostly incomplete; poor organization; very limited vocabulary; "
        "frequent pauses and hesitation; many grammar errors.",
    2:  "Minimal communication; task incomplete; no clear organization; very few words; "
        "very frequent errors severely hindering comprehension.",
    1:  "No meaningful communication attempted.",
}

WRITING_BAND_DESCRIPTORS: dict[int, str] = {
    12: "All task requirements fully met; well-structured; precise academic vocabulary; "
        "correct tone for task type; virtually no grammar/spelling errors.",
    10: "Task requirements met; clear structure; varied vocabulary; appropriate tone; "
        "minor grammar/spelling errors that do not impede reading.",
    8:  "Task requirements mostly met; adequate structure; some vocabulary variety; "
        "generally appropriate tone; some grammar errors.",
    6:  "Task requirements partially met; some structure; limited vocabulary; tone issues; "
        "several grammar errors.",
    4:  "Many task requirements missed; poor structure; very limited vocabulary; "
        "inappropriate tone; frequent errors.",
    1:  "Task requirements not met; no structure; incomprehensible.",
}
```

**`app/services/ai/rubric/speaking_rubric.py`**
```python
from app.services.ai.rubric.band_descriptors import SPEAKING_BAND_DESCRIPTORS

BASE_SPEAKING_SYSTEM_PROMPT = """
You are a certified CELPIP examiner with 10 years of experience scoring speaking responses.

## Your Task
Score the candidate's speaking response on FIVE dimensions, each scored 1–12 (CELPIP scale).
Return ONLY valid JSON conforming to the provided schema. Do NOT add commentary outside the JSON.

## CELPIP Speaking Dimensions
1. **Task Completion** — Does the response fully address all parts of the prompt?
2. **Coherence & Cohesion** — Is the response logically organized with appropriate discourse markers?
3. **Vocabulary Range** — Does the candidate use varied, precise, context-appropriate vocabulary?
4. **Fluency & Pronunciation** — Is delivery smooth? Minimal unnatural pauses?
5. **Grammatical Accuracy** — Are grammatical structures accurate and varied?

## Band Scale Reference
{band_descriptors}

## Calibration Examples
{calibration_block}

## Scoring Rules
- Score EACH dimension independently before computing the band estimate.
- `estimated_band` = weighted average (Task Completion ×0.25, Coherence ×0.20, Vocabulary ×0.20, Fluency ×0.20, Grammar ×0.15), rounded to nearest 0.5.
- `strengths` and `weaknesses`: max 3 items each, concrete and specific (not generic like "good grammar").
- `improvement_tips`: actionable, CELPIP-focused, max 4 items.
- `sample_response`: ~3 sentences showing a Band 10+ response to the same prompt.
""".strip()


def build_speaking_system_prompt(calibration_block: str) -> str:
    band_text = "\n".join(
        f"Band {band}: {desc}"
        for band, desc in sorted(SPEAKING_BAND_DESCRIPTORS.items(), reverse=True)
    )
    return BASE_SPEAKING_SYSTEM_PROMPT.format(
        band_descriptors=band_text,
        calibration_block=calibration_block or "No calibration examples available.",
    )
```

---

### Step 3 — Calibration Integration

**`app/services/ai/calibration.py`**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.calibration import CalibrationSample


async def build_calibration_context(
    db: AsyncSession,
    skill: str,
    task_number: int | None,
) -> str:
    """
    Fetches active calibration samples from DB.
    Returns formatted block for injection into system prompt.
    Samples that apply to all tasks (task_number IS NULL) are always included.
    """
    stmt = (
        select(CalibrationSample)
        .where(CalibrationSample.skill == skill)
        .where(CalibrationSample.is_active == True)
        .where(
            (CalibrationSample.task_number == task_number)
            | (CalibrationSample.task_number.is_(None))
        )
        .order_by(CalibrationSample.band_level.desc())
        .limit(4)  # Max 4 calibration samples per call to control token count
    )
    result = await db.execute(stmt)
    samples = result.scalars().all()

    if not samples:
        return ""

    lines = ["### Reference Examples (do NOT copy — use as calibration anchor)"]
    for s in samples:
        lines.append(f"\n**Band {s.band_level} Example:**\n{s.sample_text[:400]}...")
    return "\n".join(lines)
```

---

### Step 4 — Cost Tracker

**`app/services/ai/cost_tracker.py`**
```python
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ai_cost_log import AICostLog
from app.services.ai.base import TokenUsage

# Approximate costs in USD per 1K tokens (update as provider pricing changes)
COST_PER_1K_TOKENS: dict[str, dict[str, float]] = {
    "openai": {
        "gpt-4o-mini":   {"input": 0.00015, "output": 0.00060},
        "gpt-4o":        {"input": 0.00250, "output": 0.01000},
        "whisper-1":     {"input": 0.00600, "output": 0.0},      # per minute, approximated
    },
    "anthropic": {
        "claude-haiku-20240307": {"input": 0.00025, "output": 0.00125},
    },
    "gemini": {
        "gemini-1.5-flash": {"input": 0.00007, "output": 0.00030},
    },
}


def estimate_cost(provider: str, model: str, usage: TokenUsage) -> float:
    rates = COST_PER_1K_TOKENS.get(provider, {}).get(model, {})
    if not rates:
        return 0.0
    return (usage.prompt_tokens / 1000 * rates["input"]) + \
           (usage.completion_tokens / 1000 * rates["output"])


async def log_cost(
    db: AsyncSession,
    attempt_id: UUID,
    provider: str,
    model: str,
    operation: str,
    usage: TokenUsage,
) -> None:
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
    await db.flush()
```

---

### Step 5 — Replace Speaking Worker Stub

**`app/workers/speaking_tasks.py`** (replaces stub entirely)
```python
"""
Speaking pipeline:
  1. Download audio from S3
  2. Transcribe via Whisper
  3. Build rubric prompt with calibration context
  4. Score transcript via LLM
  5. Persist transcript + score_report + dimensions + feedback
  6. Log cost
  7. Mark attempt complete (or failed)
"""

import asyncio
import logging
from uuid import UUID

from celery import shared_task
from sqlalchemy import update

from app.core.db import get_sync_session  # sync session factory for Celery context
from app.models.attempt import Attempt, SpeakingAttempt
from app.models.transcript import Transcript
from app.models.score_report import ScoreReport, ScoreDimension
from app.models.feedback_report import FeedbackReport
from app.services.ai.providers.openai_provider import OpenAIProvider
from app.services.ai.rubric.speaking_rubric import build_speaking_system_prompt
from app.services.ai.calibration import build_calibration_context
from app.services.ai.cost_tracker import log_cost
from app.services.storage.presigner import download_from_s3

logger = logging.getLogger(__name__)

SPEAKING_DIMENSIONS = [
    "task_completion", "coherence", "vocabulary", "fluency", "grammar"
]


@shared_task(
    bind=True,
    queue="speaking",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,                    # only ACK after task completes (safer)
)
def process_speaking_attempt(self, attempt_id: str) -> None:
    """Full AI scoring pipeline for a speaking attempt."""
    attempt_uuid = UUID(attempt_id)
    try:
        asyncio.run(_run_speaking_pipeline(attempt_uuid))
    except Exception as exc:
        logger.exception("Speaking pipeline failed for attempt %s", attempt_id)
        _mark_failed(attempt_uuid)
        raise self.retry(exc=exc)


async def _run_speaking_pipeline(attempt_id: UUID) -> None:
    async with get_sync_session() as db:
        # 1. Mark processing
        await db.execute(
            update(Attempt).where(Attempt.id == attempt_id)
            .values(status="processing")
        )
        await db.commit()

        # 2. Load attempt + prompt
        attempt = await db.get(Attempt, attempt_id)
        speaking_attempt = await db.get(SpeakingAttempt, attempt_id)
        prompt = await db.get_prompt(attempt.prompt_id)   # helper method

        # 3. Download audio from S3
        audio_bytes = await download_from_s3(speaking_attempt.audio_s3_key)

        # 4. STT
        provider = OpenAIProvider()
        transcript_text, stt_usage = await provider.transcribe(audio_bytes)

        # Save transcript
        transcript = Transcript(
            attempt_id=attempt_id,
            text=transcript_text,
            provider="openai",
            confidence_score=None,
        )
        db.add(transcript)
        await log_cost(db, attempt_id, "openai", "whisper-1", "stt", stt_usage)

        # 5. Build rubric system prompt with calibration
        calibration_block = await build_calibration_context(
            db, skill="speaking", task_number=prompt.task_number
        )
        system_prompt = build_speaking_system_prompt(calibration_block)

        # 6. Score
        result = await provider.score_speaking(transcript_text, prompt.prompt_text, system_prompt)
        await log_cost(db, attempt_id, "openai", "gpt-4o-mini", "scoring", result.usage)

        # 7. Persist score_report
        report = ScoreReport(
            attempt_id=attempt_id,
            estimated_band=result.estimated_band,
            scoring_model="gpt-4o-mini",
            raw_rubric_json=result.raw_json,
        )
        db.add(report)
        await db.flush()   # get report.id

        # 8. Persist score_dimensions (one row per rubric dimension)
        for dim_name in SPEAKING_DIMENSIONS:
            dim = ScoreDimension(
                report_id=report.id,
                dimension=dim_name,
                score=getattr(result, dim_name),
                max_score=12,
            )
            db.add(dim)

        # 9. Persist feedback_report
        feedback = FeedbackReport(
            attempt_id=attempt_id,
            strengths=result.strengths,
            weaknesses=result.weaknesses,
            improvement_tips=result.improvement_tips,
            sample_response=result.sample_response,
        )
        db.add(feedback)

        # 10. Mark complete
        await db.execute(
            update(Attempt).where(Attempt.id == attempt_id)
            .values(status="complete")
        )
        await db.commit()
        logger.info("Speaking pipeline complete: attempt=%s band=%.1f", attempt_id, result.estimated_band)
```

> The writing worker (`writing_tasks.py`) follows the same 10-step structure — it skips STT and reads `writing_attempts.essay_text` directly. Not repeated here to avoid redundancy.

---

### Step 6 — Report API Endpoint

**`app/api/v1/reports.py`**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.report import ReportResponse
from app.services.report_service import fetch_report

router = APIRouter(prefix="/attempts", tags=["reports"])


@router.get("/{attempt_id}/report", response_model=ReportResponse)
async def get_report(
    attempt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReportResponse:
    """
    Returns the full feedback report for a completed attempt.
    Row-level isolation: user can only fetch their own attempt's report.
    """
    report = await fetch_report(db, attempt_id=attempt_id, user_id=current_user.id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report
```

**`app/schemas/report.py`**
```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class DimensionScore(BaseModel):
    dimension: str
    score: int
    max_score: int
    label: str        # e.g. "Task Completion" (human-readable for UI)


class ReportResponse(BaseModel):
    attempt_id: UUID
    skill: str                          # "speaking" | "writing"
    task_title: str
    estimated_band: float
    dimensions: list[DimensionScore]
    strengths: list[str]
    weaknesses: list[str]
    improvement_tips: list[str]
    sample_response: str
    transcript: str | None              # speaking only; None for writing
    completed_at: datetime
```

---

### Step 7 — History API Endpoint

**`app/api/v1/history.py`**
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.history import PaginatedHistory
from app.services.history_service import get_user_history

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=PaginatedHistory)
async def list_history(
    skill: str | None = Query(None, pattern="^(speaking|writing)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedHistory:
    return await get_user_history(
        db, user_id=current_user.id, skill=skill, page=page, limit=limit
    )
```

---

### Step 8 — Report UI Components

#### `ScoreSummaryCard.tsx`

```typescript
// components/report/ScoreSummaryCard.tsx
// Displays the overall band score with a visual arc gauge

interface ScoreSummaryCardProps {
  estimatedBand: number;  // 1.0–12.0
  skill: "speaking" | "writing";
  taskTitle: string;
  completedAt: string;
}

// Band → colour mapping (mirrors design tokens)
const bandColor = (band: number): string => {
  if (band >= 9)  return "text-success";
  if (band >= 6)  return "text-warning";
  return "text-danger";
};
```

The arc gauge is a simple SVG `<circle>` with `strokeDashoffset` driven by `(band / 12) * circumference`. No chart library needed — keeps the bundle lean.

#### `DimensionBreakdown.tsx`

```typescript
// components/report/DimensionBreakdown.tsx
// One shadcn/ui <Progress> bar per dimension + label + score/12

interface DimensionBreakdownProps {
  dimensions: DimensionScore[];  // from API
}

// Dimension display labels (API sends snake_case keys)
const DIMENSION_LABELS: Record<string, string> = {
  task_completion:  "Task Completion",
  coherence:        "Coherence & Cohesion",
  vocabulary:       "Vocabulary Range",
  fluency:          "Fluency & Pronunciation",
  grammar:          "Grammatical Accuracy",
  task_fulfillment: "Task Fulfillment",
  organization:     "Organization",
  tone_register:    "Tone & Register",
};
```

#### `ReportPage.tsx` — Full Layout

```
ReportPage
  ├── Navbar (minimal — back to history link)
  ├── PageWrapper (max-w-3xl mx-auto py-10)
  │     ├── [Loading] → Skeleton placeholders for each section
  │     │
  │     └── [Loaded]
  │           ├── ScoreSummaryCard          ← band score + arc gauge + skill/task meta
  │           ├── DimensionBreakdown        ← 5 progress bars
  │           ├── grid grid-cols-1 md:grid-cols-2 gap-4
  │           │     ├── StrengthsPanel      ← green pill chips, max 3
  │           │     └── WeaknessesPanel     ← orange pill chips, max 3
  │           ├── ImprovementTipsAccordion  ← shadcn/ui Accordion, max 4 items
  │           ├── SampleResponseCard        ← collapsible, shadcn/ui Accordion
  │           └── TranscriptCard            ← speaking only, collapsible
  └── Footer
```

#### `useReport.ts` — TanStack Query hook

```typescript
// lib/hooks/useReport.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { ReportResponse } from "@/lib/types";

export function useReport(attemptId: string) {
  return useQuery<ReportResponse>({
    queryKey: ["report", attemptId],
    queryFn: () => apiClient.get(`/attempts/${attemptId}/report`),
    // Report is immutable once created — no need to refetch
    staleTime: Infinity,
    enabled: !!attemptId,
  });
}
```

The status polling hook already exists from Phase 1 (`useAttemptStatus`). The report page renders a skeleton until status=complete, then calls `useReport`. No changes to the polling hook.

---

### Step 9 — History UI

```
HistoryPage
  ├── Navbar + Sidebar
  ├── PageWrapper
  │     ├── "Practice History" h1 + description
  │     ├── HistoryFilterBar
  │     │     ├── SegmentedControl (All | Speaking | Writing)  — shadcn/ui Tabs
  │     │     └── (Phase 3) DateRangePicker stub
  │     └── HistoryTable
  │           ├── shadcn/ui <Table>
  │           ├── Columns: Date | Skill | Task | Band Score | Status | Action
  │           ├── ScoreBadge (reused from Phase 1 common/)
  │           ├── StatusBadge (reused from Phase 1 common/)
  │           ├── "View Report" Link → /attempts/[id]/report (only when complete)
  │           └── shadcn/ui Pagination (prev/next + page number)
  └── Footer
```

```typescript
// lib/hooks/useHistory.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { PaginatedHistory } from "@/lib/types";

export function useHistory(skill: string | null, page: number) {
  return useQuery<PaginatedHistory>({
    queryKey: ["history", skill, page],
    queryFn: () =>
      apiClient.get("/history", { params: { skill: skill ?? undefined, page, limit: 10 } }),
    placeholderData: (prev) => prev,  // keep previous page visible while fetching next
  });
}
```

---

## Provider Configuration (Environment Variables)

New env vars added in Phase 2:

```bash
# apps/api/.env

# AI Provider (hot-swappable via config, no code change needed)
AI_SCORING_PROVIDER=openai             # openai | anthropic | gemini
AI_SCORING_MODEL=gpt-4o-mini
AI_STT_PROVIDER=openai
AI_STT_MODEL=whisper-1
AI_FEEDBACK_PROVIDER=openai
AI_FEEDBACK_MODEL=gpt-4o-mini
AI_MAX_RETRIES=3
AI_TIMEOUT_SECS=90

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...           # Only needed if provider=anthropic
GEMINI_API_KEY=...                     # Only needed if provider=gemini
```

`app/core/config.py` additions:
```python
ai_scoring_provider: str  = "openai"
ai_scoring_model:    str  = "gpt-4o-mini"
ai_stt_provider:     str  = "openai"
ai_stt_model:        str  = "whisper-1"
ai_max_retries:      int  = 3
ai_timeout_secs:     int  = 90
openai_api_key:      str  = ""
anthropic_api_key:   str  = ""
gemini_api_key:      str  = ""
```

Provider factory (dependency injection):
```python
# app/core/deps.py (addition)
def get_scoring_provider() -> ScoringProvider:
    match settings.ai_scoring_provider:
        case "openai":    return OpenAIProvider()
        case "anthropic": return AnthropicProvider()
        case "gemini":    return GeminiProvider()
        case _:           raise ValueError(f"Unknown provider: {settings.ai_scoring_provider}")
```

---

## Error Handling Strategy

| Failure Point | Handling |
|---|---|
| Whisper API timeout (>90s) | `asyncio.wait_for` with 90s timeout → `TimeoutError` → retry task (max 3x) |
| LLM returns malformed JSON | Pydantic validation catches it → `ValidationError` → retry with stricter prompt |
| S3 download fails | `httpx.HTTPError` → retry task |
| All 3 retries exhausted | `attempt.status = "failed"` → user sees failure state in UI with "Try again" |
| OpenAI rate limit (429) | `tenacity` exponential backoff handles it before hitting max retries |
| Calibration DB query fails | Log warning + proceed with empty calibration block (non-fatal) |

**Dead-letter queue (Celery):**
```python
# app/workers/celery_app.py (addition)
app.conf.task_routes = {
    "app.workers.speaking_tasks.*": {"queue": "speaking"},
    "app.workers.writing_tasks.*":  {"queue": "writing"},
}
app.conf.task_reject_on_worker_lost = True
app.conf.task_acks_late = True

# Failed tasks after max_retries land here for manual inspection
app.conf.task_queues = [
    Queue("speaking"),
    Queue("writing"),
    Queue("dead_letter"),
]
```

---

## Test Plan

### Backend Tests (pytest-asyncio)

```
tests/
├── test_reports.py
│   ├── test_get_report_own_attempt_returns_200
│   ├── test_get_report_other_user_attempt_returns_404       ← row-level isolation
│   ├── test_get_report_pending_attempt_returns_404
│   └── test_get_report_response_schema_valid
│
├── test_history.py
│   ├── test_history_returns_paginated_results
│   ├── test_history_filter_by_skill
│   └── test_history_empty_state
│
├── test_ai_pipeline.py
│   ├── test_speaking_pipeline_end_to_end (mock OpenAI client)
│   ├── test_writing_pipeline_end_to_end
│   ├── test_pipeline_marks_failed_on_provider_error
│   ├── test_cost_logged_after_successful_score
│   └── test_retry_on_transient_error
│
└── test_calibration.py
    ├── test_build_context_with_samples
    └── test_build_context_no_samples_returns_empty_string
```

**AI calls are always mocked in tests.** A `MockScoringProvider` fixture returns a hardcoded `ScoringResult` so tests never hit the network and cost nothing.

```python
# tests/conftest.py (addition)
@pytest.fixture
def mock_provider(monkeypatch):
    class MockScoringProvider:
        async def transcribe(self, audio_bytes):
            return "This is a test transcript.", TokenUsage()
        async def score_speaking(self, transcript, prompt, system):
            return ScoringResult(
                task_completion=9, coherence=8, vocabulary=8,
                fluency=9, grammar=8, estimated_band=8.5,
                strengths=["Clear delivery"],
                weaknesses=["Limited vocabulary range"],
                improvement_tips=["Use more academic connectors"],
                sample_response="Here is a sample high-band response.",
            )
        async def score_writing(self, essay, prompt, system):
            return ScoringResult(estimated_band=7.5, task_fulfillment=8, ...)
    monkeypatch.setattr("app.workers.speaking_tasks.OpenAIProvider", MockScoringProvider)
    monkeypatch.setattr("app.workers.writing_tasks.OpenAIProvider", MockScoringProvider)
    return MockScoringProvider()
```

### Frontend Tests

- `ReportPage` renders with mock report data (React Testing Library)
- `ScoreSummaryCard` renders correct band color class for band < 6, 6–8, ≥ 9
- `useReport` hook: loading state → data state with msw mock
- `HistoryTable` pagination: clicking page 2 triggers correct query param
- Playwright E2E smoke test: submit writing attempt → poll status → click "View Report" → report renders

---

## Build Order — Week by Week

### Week 4 — AI Foundation

| Day | Task |
|---|---|
| **Day 1** | Alembic migration `0002` (indexes + `ai_cost_log`). Implement `base.py` (Protocol + dataclasses). Implement `OpenAIProvider` Whisper STT path only. Unit test with a real `.webm` file in local dev. |
| **Day 2** | `band_descriptors.py` + `speaking_rubric.py` + `writing_rubric.py`. Write and manually iterate on the system prompts until GPT-4o-mini returns well-calibrated scores on 3 sample transcripts. |
| **Day 3** | `calibration.py` — wire to DB. `cost_tracker.py`. Add `ai_cost_log` SQLAlchemy model. |
| **Day 4** | Replace `speaking_tasks.py` worker stub with real pipeline (Steps 1–10 above). Run end-to-end in Docker: submit real audio, see transcript + score in DB. |
| **Day 5** | Replace `writing_tasks.py` worker stub with real pipeline. Run end-to-end. Confirm both pipelines write all tables correctly. |

### Week 5 — API + Quality

| Day | Task |
|---|---|
| **Day 6** | `report_service.py` + `reports.py` API endpoint + `ReportResponse` schema. Write `test_reports.py`. |
| **Day 7** | `history_service.py` + `history.py` API endpoint + `PaginatedHistory` schema. Write `test_history.py`. |
| **Day 8** | `test_ai_pipeline.py` — mock all OpenAI calls. Ensure CI passes without live AI. Error handling: test failure paths. |
| **Day 9** | Rubric calibration tuning session: run 10 real speaking attempts across band levels, compare AI scores to your own assessment. Adjust band_descriptors.py + system prompt until scores feel calibrated. |
| **Day 10** | Implement `AnthropicProvider` and `GeminiProvider` stubs (just enough to satisfy the Protocol — raise `NotImplementedError` on methods). Verify provider factory + config-driven selection works end-to-end. |

### Week 6 — Frontend Report + History

| Day | Task |
|---|---|
| **Day 11** | `useReport.ts` + `useHistory.ts` hooks. Wire `/attempts/[id]/report/page.tsx` to real API. Replace `ReportPlaceholder` with `ReportPage` shell + skeleton states. |
| **Day 12** | Build all report sub-components: `ScoreSummaryCard` (SVG arc gauge), `DimensionBreakdown` (Progress bars), `StrengthsPanel`, `WeaknessesPanel`. |
| **Day 13** | Build `ImprovementTipsAccordion`, `SampleResponseCard`, `TranscriptCard`. Wire `AttemptStatusCard` "View Report" button. |
| **Day 14** | Build history page: `HistoryFilterBar`, `HistoryTable` (pagination). Update `Dashboard → RecentAttemptsWidget` to link to reports. |
| **Day 15** | Full integration pass: speaking end-to-end in browser. Writing end-to-end. Check all Tailwind acceptance criteria. Playwright E2E smoke test. Fix all bugs. CI green. |

---

## Acceptance Criteria for Phase 2

```
AI Pipeline
  [ ] Speaking: submit audio → transcript saved in DB within 45s (95th percentile)
  [ ] Writing: submit essay → score report saved in DB within 20s (95th percentile)
  [ ] All 5 speaking dimensions populated per report (not null, not zero)
  [ ] All 5 writing dimensions populated per report
  [ ] estimated_band is between 1.0 and 12.0
  [ ] strengths, weaknesses, improvement_tips are non-empty lists
  [ ] Token cost logged in ai_cost_log for every AI call
  [ ] Provider swap (openai → gemini) requires ONLY config change, confirmed by test

Error Handling
  [ ] Attempt status = "failed" when all 3 retries exhausted
  [ ] UI shows error state + "Try again" CTA on failed attempt
  [ ] Calibration DB failure does not crash the pipeline

Report Page
  [ ] Band score rendered with correct color: green ≥9, amber 6–8, red ≤5
  [ ] Arc gauge animates to correct value on page load
  [ ] All 5 dimension bars render with correct scores
  [ ] Strengths (green) + Weaknesses (orange) chips match API response
  [ ] Improvement Tips accordion opens/closes correctly
  [ ] Sample Response accordion opens/closes correctly
  [ ] TranscriptCard visible only on speaking reports
  [ ] Report page inaccessible for another user's attempt (404)
  [ ] Loading skeleton visible while report is fetching

History Page
  [ ] All user attempts listed, newest first
  [ ] "Speaking" filter shows only speaking attempts
  [ ] "Writing" filter shows only writing attempts
  [ ] "View Report" link only visible for status=complete attempts
  [ ] Pagination works: page 2 fetches next 10 results
  [ ] Empty state shown when user has no attempts

Security
  [ ] GET /attempts/{id}/report returns 404 for another user's attempt_id (not 403 — no information leakage)
  [ ] GET /history never returns another user's attempts
  [ ] No sensitive AI cost data exposed in frontend API responses
```

---

## Phase 2 Deliverable

> A user can submit a speaking or writing attempt and receive a full CELPIP-aligned feedback report within 60 seconds — including estimated band score, per-dimension scores, strengths, weaknesses, improvement tips, and a sample high-band response. Attempt history is persisted and browsable. The AI provider is hot-swappable via config. Token costs are logged per attempt.

---

> [!IMPORTANT]
> **Rubric calibration is the highest-risk task in Phase 2.** Reserve 1 full day (Day 9) for manual evaluation of AI scores against your own assessment. The system prompt is the product — if the LLM is scoring Band 5 responses as Band 9, no amount of engineering fixes it. Iterate on `band_descriptors.py` and the system prompt until scores are within ±1 band of your human assessment on ≥80% of test cases.

> [!NOTE]
> **Writing pipeline does NOT use Whisper.** Skip Step 3 (STT) entirely for writing — the essay text is already in the DB from Phase 1. The writing Celery worker goes directly to calibration context → system prompt → LLM scoring.

> [!TIP]
> **Cost control during development:** Set `AI_SCORING_MODEL=gpt-4o-mini` (not `gpt-4o`) for all dev + staging work. At ~$0.02–0.05 per attempt, 100 test attempts costs ~$2–5. Only consider upgrading to `gpt-4o` if `gpt-4o-mini` scores prove systematically miscalibrated after Day 9 tuning.
