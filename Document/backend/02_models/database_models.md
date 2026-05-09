# CELPIP PRO — Database Models (ORM Layer)

**Author:** Senior Software Engineer  
**ORM:** SQLAlchemy 2.x (async, mapped_column API)  
**File location:** `apps/api/app/models/`

All models inherit from `Base` (declarative) and `TimestampMixin` which adds
`created_at` and `updated_at` columns automatically.

---

## 1. `User` — `models/user.py`

### Purpose
The canonical user record. Created lazily on first authenticated API call via
`get_or_create_user()`. Clerk is the identity source of truth; this row stores
app-specific state only.

### Table: `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Internal platform identifier |
| `clerk_user_id` | String (unique, indexed) | Clerk's external user ID — used to link JWT `sub` claim |
| `email` | String (unique) | User email from Clerk JWT |
| `full_name` | Text (nullable) | Display name |
| `plan` | String | Active plan: `starter` \| `pro` \| `ultra` — DB CHECK constraint enforced |
| `is_admin` | Boolean | Admin flag, synced from Clerk `publicMetadata.role` |
| `streak_days` | Integer | Consecutive active days; updated on every authenticated request |
| `last_active_date` | Date | Compared against `X-User-Date` header for streak logic |
| `target_band` | Numeric(3,1) | User's self-set CELPIP target band (e.g. 9.0) |
| `tos_accepted_at` | DateTime (tz-aware) | When user accepted Terms of Service |
| `tos_version` | String(32) | Version string of accepted ToS (e.g. `2026-04-22`) |

### Key relationships
- `User.id` is FK target for `attempts`, `subscriptions`, `score_reports` (via attempts), `mock_exam_attempts`.

---

## 2. `Attempt` + `SpeakingAttempt` + `WritingAttempt` — `models/attempt.py`

### Purpose
Tracks every practice or mock exam attempt. Uses a **parent-child table split**:
`Attempt` holds shared fields; `SpeakingAttempt` / `WritingAttempt` hold
skill-specific payload. This avoids nullable columns on the base table.

### Table: `attempts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Attempt identifier; also used as S3 folder key |
| `user_id` | UUID (FK → users, CASCADE) | Owner |
| `skill` | Text | `speaking` \| `writing` — CHECK constraint enforced |
| `prompt_id` | UUID | FK to `speaking_prompts` or `writing_prompts` |
| `task_number` | Integer | Task 1–8 (speaking) or 1–2 (writing) |
| `is_mock_test` | Boolean | `true` for mock exam attempts |
| `mock_exam_number` | Integer (nullable) | Exam slot (1, 2, …); quota counted as DISTINCT slots |
| `status` | Text | `pending` → `processing` → `complete` \| `failed` \| `cancelled` |
| `celery_task_id` | Text (nullable) | Celery task ID for status polling |
| `error_message` | Text (nullable) | Set when `status = failed` |

**Indexes:**
- `idx_attempts_quota` on `(user_id, skill, task_number)` — fast quota count queries
- `idx_attempts_mock` on `(user_id, skill, is_mock_test)`
- `idx_attempts_writing_mock_slot` on `(user_id, skill, mock_exam_number)`

### Table: `speaking_attempts`

| Column | Type | Description |
|--------|------|-------------|
| `attempt_id` | UUID (PK, FK → attempts CASCADE) | 1-to-1 with Attempt |
| `audio_s3_key` | Text | S3 object key for the raw WebM audio upload |
| `audio_m4a_s3_key` | Text | Transcoded M4A key (Safari playback compatibility) |
| `audio_duration_ms` | Integer | Duration in milliseconds |
| `upload_completed` | Boolean | `true` once the presigned PUT is confirmed complete |

### Table: `writing_attempts`

| Column | Type | Description |
|--------|------|-------------|
| `attempt_id` | UUID (PK, FK → attempts CASCADE) | 1-to-1 with Attempt |
| `essay_text` | Text | Full essay body submitted by user |
| `word_count` | Integer | Computed word count at submission |
| `char_count` | Integer | Computed character count |
| `auto_submitted` | Boolean | `true` if timer expired and auto-submit fired |

---

## 3. `Prompt` — `models/prompt.py`

### Purpose
Stores all CELPIP practice and mock exam prompts. Both speaking and writing
prompts live in separate tables but share a common admin management flow.

### Table: `speaking_prompts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | |
| `task_number` | Integer | 1–8 |
| `prompt_text` | Text | The question text shown to the user |
| `context_image_url` | Text (nullable) | S3 URL for image-based tasks (3, 4, 8) |
| `prep_time_seconds` | Integer | Countdown for preparation phase |
| `response_time_seconds` | Integer | Countdown for recording phase |
| `sample_response_text` | Text | Band-12 anchor sample used for AI calibration |
| `exam_slot` | Integer (nullable) | Mock exam slot (1, 2, …); `NULL` = practice-only |
| `is_active` | Boolean | Soft-delete / publication toggle |
| `difficulty` | String | `easy` \| `medium` \| `hard` |

### Table: `writing_prompts`

Same structure adapted for writing tasks (1 & 2), with `min_words`, `max_words`,
`time_limit_seconds`, and essay-type metadata columns.

---

## 4. `ScoreReport` + `ScoreDimension` — `models/score_report.py`

### Purpose
Stores AI-generated scoring output. `ScoreReport` holds the aggregate band;
`ScoreDimension` holds per-dimension scores (4 dimensions for speaking,
4 for writing).

### Table: `score_reports`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | |
| `attempt_id` | UUID (FK → attempts) | |
| `estimated_band` | Numeric | Overall CELPIP band (1–12) |
| `likely_range` | String | e.g. `"8–9"` — model confidence range |
| `scoring_model` | String | e.g. `gpt-4o-mini`, `gpt-4o` (vision tasks) |
| `raw_rubric_json` | JSON | Full raw response from the scoring model |
| `schema_version` | Integer | `2` = current 4-dimension schema |

### Table: `score_dimensions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | |
| `report_id` | UUID (FK → score_reports) | |
| `dimension` | String | `content_coherence`, `vocabulary`, `listenability`, `task_fulfillment` |
| `score` | Integer | 0–12 |
| `max_score` | Integer | Always 12 |

---

## 5. `FeedbackReport` — `models/feedback_report.py`

### Purpose
Stores the qualitative AI feedback generated alongside the score. Separated
from `ScoreReport` so feedback can be queried independently (e.g. locked behind
plan gate).

### Table: `feedback_reports`

| Column | Type | Description |
|--------|------|-------------|
| `attempt_id` | UUID (PK, FK → attempts) | |
| `strengths` | JSON array | List of `{point, example}` objects |
| `weaknesses` | JSON array | List of `{point, example}` objects |
| `improvement_tips` | JSON array | List of `{tip, priority}` objects |
| `sample_response` | Text | AI-generated model answer |
| `next_milestone` | Text (nullable) | Personalised next-step advice |
| `dimension_commentary` | JSON (nullable) | Per-dimension prose commentary |

---

## 6. `Subscription` — `models/subscription.py`

### Purpose
Records payment history and current plan status. Each Stripe checkout creates
or updates one row per user. Used by the nightly reconciliation task and the
webhook handler.

### Table: `subscriptions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | |
| `user_id` | UUID (FK → users) | |
| `stripe_customer_id` | String (nullable) | Stripe `cus_*` ID |
| `stripe_payment_intent_id` | String (nullable) | Stripe `pi_*` — used for refund detection |
| `plan` | String | `pro` \| `ultra` |
| `status` | String | `active` \| `refunded` \| `cancelled` |
| `payment_type` | String | `one_time` (current model) |

---

## 7. `Transcript` — `models/transcript.py`

Stores Whisper STT output for a speaking attempt.

| Column | Type | Description |
|--------|------|-------------|
| `attempt_id` | UUID (PK, FK → attempts) | |
| `text` | Text | Full transcript |
| `provider` | String | `openai` |
| `confidence_score` | Float (nullable) | Reserved for future use |

---

## 8. `StripeEvent` — `models/stripe_event.py`

Idempotency log for Stripe webhook events. Prevents duplicate processing on
Stripe retries.

| Column | Type | Description |
|--------|------|-------------|
| `event_id` | String (PK) | Stripe's `evt_*` ID — unique constraint prevents double-processing |
| `event_type` | String | e.g. `checkout.session.completed` |
| `status` | String | `processing` → `processed` |

---

## 9. Supporting Models

| Model | Table | Purpose |
|-------|-------|---------|
| `AiCostLog` | `ai_cost_logs` | Tracks token usage and estimated cost per AI call (STT + scoring) |
| `AdminAuditLog` | `admin_audit_logs` | Records every admin mutation (prompt create/edit/delete) |
| `ReconciliationRun` | `reconciliation_runs` | Audit trail for nightly Stripe reconciliation sweeps |
| `ContentAsset` | `content_assets` | S3-backed media assets (images, audio) managed by admin |
| `ContentVersion` | `content_versions` | Versioning history for admin-managed content |
| `ContentTag` | `content_tags` | Tagging system for prompts and materials |
| `LearningMaterial` | `learning_materials` | Study materials linked to specific tasks |
| `MockExamAttempt` | `mock_exam_attempts` | Aggregate record for a full 8-task mock exam session |
| `Calibration` | `calibrations` | Band-12 anchor samples used to calibrate AI scoring |
| `ExportJob` | `export_jobs` | GDPR data export jobs (async, Celery-backed) |
