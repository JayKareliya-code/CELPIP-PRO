# CELPIP PRO — AI Scoring Pipelines

**Author:** Senior Software Engineer  
**Location:** `apps/api/app/services/ai/`  
**Execution context:** Celery workers (async, isolated per queue)

---

## 1. Architecture Overview

All AI scoring runs **outside the request/response cycle** in dedicated Celery
worker processes. The API route enqueues a task and returns immediately; the
client polls `/attempts/{id}/status` or receives an SSE event when complete.

```
API Route (POST /speaking/attempts/{id}/complete)
    ↓ enqueue
Celery Queue ("speaking")
    ↓
speaking_tasks.score_speaking_attempt(attempt_id)
    ↓
run_speaking_pipeline(attempt_id)
    ↓ 10-step pipeline (see below)
PostgreSQL (score_reports, feedback_reports, transcripts)
```

### AI Provider Stack

| Task | Provider | Model | Config Variable |
|------|----------|-------|-----------------|
| Speech-to-Text | OpenAI Whisper | `whisper-1` | `AI_STT_MODEL` |
| Scoring (text tasks) | OpenAI Chat | `gpt-4o-mini` | `AI_SCORING_MODEL` |
| Scoring (image tasks 3/4/8) | OpenAI Vision | `gpt-4o` | `AI_VISION_SCORING_MODEL` |
| Feedback generation | OpenAI Chat | `gpt-4o-mini` | `AI_FEEDBACK_MODEL` |

Multi-provider support is planned via a provider abstraction layer
(`services/ai/providers/`). Currently `OpenAIProvider` is the only active
implementation.

---

## 2. Speaking Pipeline — `services/ai/pipeline/speaking_pipeline.py`

### 10-Step Orchestration

```
Step 1   mark_processing     SET attempts.status = 'processing'
Step 2   load_attempt        Fetch Attempt + SpeakingAttempt rows
Step 3   load_user_band      SELECT target_band FROM users
Step 4   load_prompt         Fetch prompt_text, task_number, context_image_url,
                             sample_response_text, response_time_seconds
Step 5   download_audio      Stream raw audio bytes from S3/R2
Step 6   transcribe          Whisper STT → save Transcript row + log AI cost
Step 7   build_prompt        Assemble system prompt with rubric + calibration block
Step 8   score               GPT-4o[-mini] scoring → log AI cost
Step 9   save_score          INSERT ScoreReport + 4x ScoreDimension rows
Step 10  save_feedback       INSERT FeedbackReport
Step 11  mark_complete       SET attempts.status = 'complete'
```

### `PromptContext` Dataclass

```python
@dataclass(slots=True)
class PromptContext:
    prompt_text:           str
    task_number:           int
    context_image_url:     str | None   # presigned GET URL (5-min TTL)
    sample_response_text:  str          # Band-12 anchor for calibration
    response_time_seconds: int          # Used to scale calibration budget

    @property
    def is_image_task(self) -> bool:
        return self.task_number in IMAGE_TASKS  # {3, 4, 8}

    @property
    def scoring_model(self) -> str:
        # Auto-selects gpt-4o for image tasks, gpt-4o-mini for text
        return AI_VISION_SCORING_MODEL if self.is_image_task else AI_SCORING_MODEL

    @property
    def calibration_max_chars(self) -> int:
        # Budget scales with task length: 60s × 5 = 300 chars min 400
        return max(400, self.response_time_seconds * 5)
```

### Image Task Handling (Tasks 3, 4, 8)
- The stored `context_image_url` is a private S3/R2 URL.
- A **5-minute presigned GET URL** is generated so OpenAI's vision API can
  fetch the image without exposing bucket credentials.
- GPT-4o (vision) is automatically selected; text-only tasks use GPT-4o-mini.

### Calibration System
`build_calibration_context(db, skill, task_number, prompt_band12_sample, max_chars)`:
1. Checks `prompt.sample_response_text` (prompt-specific Band-12 anchor)
2. Falls back to global pool from `calibrations` table if no anchor set
3. Truncates to `calibration_max_chars` to stay within context budget
4. Injected into the system prompt as a grading reference

### CELPIP 4-Dimension Scoring Schema (v2)

| Dimension | Description |
|-----------|-------------|
| `content_coherence` | Logical flow and organisation of ideas |
| `vocabulary` | Range and accuracy of word choice |
| `listenability` | Pronunciation, fluency, and naturalness |
| `task_fulfillment` | Degree to which the prompt was addressed |

Each scored 0–12. `schema_version=2` recorded on every `ScoreReport`.

### Cost Logging
Every AI call logs to `ai_cost_logs`:
```python
await log_cost(db, attempt_id, "openai", model, operation, usage)
# operation: "stt" | "scoring" | "feedback"
# usage: { prompt_tokens, completion_tokens, total_tokens }
```

### Error Handling & Retries
- Full pipeline runs inside a single `AsyncSession` transaction
- On any exception: `db.rollback()` → attempt stays `processing`
- Celery retry policy: `acks_late=True`, `task_reject_on_worker_lost=True`
  (task requeued if worker dies mid-execution)
- AI calls: `AI_MAX_RETRIES=3`, `AI_TIMEOUT_SECS=90`

---

## 3. Writing Pipeline — `services/ai/pipeline/writing_pipeline.py`

Same 10-step structure as speaking, with these differences:

| Step | Difference |
|------|-----------|
| Step 5 | No audio download — essay text read from `WritingAttempt.essay_text` |
| Step 6 | No STT — text goes directly to scoring |
| Dimensions | `task_fulfillment`, `coherence_cohesion`, `lexical_resource`, `grammatical_range` |
| Model | Always `gpt-4o-mini` (no vision tasks in writing) |

Essay sanitisation runs before the pipeline via `services/sanitizer.py`
(strips HTML tags, invisible unicode, repeated whitespace).

---

## 4. Mock Exam Pipeline — `services/ai/pipeline/mock_exam_pipeline.py`

**Queue:** `mock_exam` (isolated — never competes with practice attempts)

Extends the speaking pipeline for the full 8-task mock exam context:

- Loads all 8 attempt rows for the session
- Runs each task through the same speaking pipeline steps
- Generates a **session-level aggregate report** in addition to per-task scores
- Computes overall estimated band as a weighted average across dimensions

---

## 5. Writing Mock Pipeline — `services/ai/pipeline/writing_mock_pipeline.py`

**Queue:** `writing_mock` (isolated)

Same as writing pipeline but:
- Processes both Writing Task 1 and Task 2 from the same mock exam session
- Generates combined session report with task-by-task comparison

---

## 6. `services/ai/base.py` — `ScoringResult`

Shared return type for all scoring providers:

```python
@dataclass
class ScoringResult:
    estimated_band:       float
    likely_range:         str | None        # e.g. "8–9"
    content_coherence:    int               # 0–12
    vocabulary:           int               # 0–12
    listenability:        int               # 0–12
    task_fulfillment:     int               # 0–12
    strengths:            list[Strength]    # { point, example }
    weaknesses:           list[Weakness]    # { point, example }
    improvement_tips:     list[Tip]         # { tip, priority }
    sample_response:      str
    next_milestone:       str | None
    dimension_commentary: dict | None
    raw_json:             dict              # full model output for audit
    usage:                dict              # token counts
```

---

## 7. `services/ai/providers/openai_provider.py` — OpenAIProvider

Wraps the OpenAI Python SDK with:

| Method | Purpose | Model used |
|--------|---------|------------|
| `transcribe(audio_bytes)` | Whisper STT | `whisper-1` |
| `score_speaking(transcript, prompt_text, system_prompt, image_url?)` | Band scoring | `gpt-4o-mini` or `gpt-4o` |
| `score_writing(essay_text, prompt_text, system_prompt)` | Band scoring | `gpt-4o-mini` |
| `aclose()` | Closes the async HTTP client | — |

All methods return `(result, usage_dict)` tuples. Structured JSON output
is enforced via OpenAI's `response_format={"type": "json_object"}` parameter.
