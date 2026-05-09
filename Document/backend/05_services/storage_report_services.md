# CELPIP PRO — Storage, Report & Supporting Services

**Author:** Senior Software Engineer  
**Location:** `apps/api/app/services/`

---

## 1. Storage Service — `services/storage_service.py` & `services/storage/presigner.py`

### Purpose
Abstracts all S3/Cloudflare R2 interactions behind a clean interface.
The platform uses S3-compatible object storage for:

| Asset type | S3 key pattern | Access |
|------------|---------------|--------|
| Raw speaking audio (WebM) | `audio/{attempt_id}/raw.webm` | Private — presigned URL only |
| Transcoded audio (M4A) | `audio/{attempt_id}/transcoded.m4a` | Private — presigned URL only |
| Prompt context images | `images/prompts/{prompt_id}/{filename}` | Private — presigned URL for AI |
| Admin-uploaded assets | `assets/{asset_id}/{filename}` | Private |
| GDPR export archives | `exports/{job_id}/data.zip` | Private — short-lived presigned URL |

### Key Functions

#### `generate_presigned_put(key, expires_in=900)` → `str`
Generates a time-limited URL the **client** uses to upload audio directly
to S3 — no audio bytes pass through the API server.

- **Expiry:** 900 seconds (15 minutes) — matches `S3_UPLOAD_EXPIRY_SECS`
- **Content-Type enforcement:** `audio/webm` on speaking uploads
- **Max size:** 25 MB enforced at S3 bucket policy level

#### `generate_presigned_get(key, expires_in=3600)` → `str`
Generates a read URL for downloading private assets.

- Used by the AI pipeline to give OpenAI's vision API access to prompt images (5-min TTL)
- Used by the report page to stream transcoded M4A audio to the browser (1-hour TTL)

#### `download_from_s3(key)` → `bytes`
Downloads the raw audio bytes for Whisper STT transcription inside the
scoring pipeline. Streams directly into memory (max 25 MB guard).

#### `upload_to_s3(key, data, content_type)` → `None`
Used by admin asset upload and GDPR export jobs to PUT objects directly.

#### `extract_s3_key(url)` → `str`
Strips the bucket domain prefix and query string from a stored S3 URL to
recover the bare object key. Used before generating presigned URLs in the pipeline.

### Configuration
```python
S3_BUCKET_NAME         = "celpip"
S3_REGION              = "us-east-1"
S3_ENDPOINT_URL        = None          # Set for Cloudflare R2 or MinIO
AWS_ACCESS_KEY_ID      = "..."
AWS_SECRET_ACCESS_KEY  = "..."
```
Setting `S3_ENDPOINT_URL` switches the boto3 client to the custom endpoint,
enabling **Cloudflare R2** as a drop-in S3 replacement.

---

## 2. Report Service — `services/report_service.py`

### Purpose
Assembles the full scored report for display in the frontend. Aggregates
data from `score_reports`, `score_dimensions`, `feedback_reports`,
`transcripts`, and `attempts` into a single structured response.

### `get_report(attempt_id, user, db)` → `ReportResponse`

**Input:** `attempt_id: UUID`, authenticated `User`  
**Output:** Plan-gated `ReportResponse` schema

#### Plan Gating

```python
if user.plan == "starter":
    return StarterReport(
        attempt_id=...,
        estimated_band=score_report.estimated_band,
        dimensions="locked",
        feedback="locked",
    )

# Pro / Ultra: full report
return ProReport(
    attempt_id=...,
    estimated_band=...,
    likely_range=...,
    dimensions=[...],          # 4 ScoreDimension rows
    strengths=[...],           # from FeedbackReport
    weaknesses=[...],
    improvement_tips=[...],
    sample_response=...,
    transcript=...,
    dimension_commentary=...,
    audio_url=generate_presigned_get(m4a_key),  # playback URL
)
```

#### Score History Enrichment
The report service also queries previous attempts on the same prompt to
compute a **progress delta** (`band_change = current - previous_best`),
displayed in the `ScoreProgressCard` frontend component.

---

## 3. Prompt Service — `services/prompt_service.py`

### Purpose
Serves practice and mock exam prompts to authenticated users, applying
availability filters and user-specific "already attempted" flags.

### `get_prompts_for_task(task_number, skill, user, db)` → `list[PromptOut]`

- Filters `is_active=True`, `exam_slot IS NULL` (practice prompts only)
- Joins against `attempts` to set `has_been_attempted: bool` per prompt
- Starter users receive prompts but `is_locked=True` on all

### `get_mock_exam_prompts(slot, skill, db)` → `list[PromptOut]`

- Filters `exam_slot = slot` (specific mock exam)
- Returns exactly 8 prompts ordered by `task_number`
- Returns `HTTP 404` with `COMING_SOON` code if fewer than 8 prompts are
  available for the slot — triggers the "Coming Soon" UI in the frontend

---

## 4. Attempt Service — `services/attempt_service.py`

### Purpose
Encapsulates the full attempt creation flow for both speaking and writing,
coordinating quota enforcement, DB inserts, and presigned URL generation.

### `create_speaking_attempt(user, payload, db)` → `AttemptCreatedResponse`

```
1. enforce_quota(user, "speaking", task_number, is_mock_test, ...)
2. INSERT Attempt (status="pending")
3. INSERT SpeakingAttempt (upload_completed=False)
4. generate_presigned_put(key=f"audio/{attempt_id}/raw.webm")
5. Return { attempt_id, upload_url, expires_in=900 }
```

### `complete_speaking_attempt(attempt_id, user, db)` → `dict`

```
1. Load Attempt + SpeakingAttempt, verify ownership
2. Check upload_completed == False (idempotency)
3. SET upload_completed = True, status = "processing"
4. Dispatch Celery task: score_speaking_attempt.delay(str(attempt_id))
5. Return { attempt_id, celery_task_id, status }
```

### `create_writing_attempt` / `submit_writing_attempt`

Same pattern as speaking but:
- No presigned URL (essay text submitted inline)
- `submit_writing_attempt` validates essay length, runs sanitiser,
  stores `essay_text` + `word_count` + `char_count`

---

## 5. User Service — `services/user_service.py`

### `get_or_create_user(db, clerk_user_id, email, full_name, user_date)` → `User`

Called on every authenticated request. Uses an **upsert pattern**:

```sql
INSERT INTO users (id, clerk_user_id, email, full_name)
VALUES (...)
ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email
RETURNING *
```

After upsert, updates the **streak counter**:
- `user_date` = date from `X-User-Date` header (user's local date)
- If `last_active_date` == yesterday → `streak_days += 1`
- If `last_active_date` == today → no change (already counted)
- Otherwise → reset `streak_days = 1`

### `get_user_quota(user, db)` → `QuotaResponse`

Queries `AttemptRepository` for all DISTINCT prompt counts and mock slot
counts per task, formats into the nested quota structure returned by
`GET /users/me/quota`.

---

## 6. History Service — `services/history_service.py`

Thin delegation layer to `AttemptRepository.get_history_page(...)`.

Applies filters: `skill`, `is_mock_test`, `task_number`, pagination (`page`, `limit`).
Returns `(items, total_count)` tuple.

---

## 7. Admin Services

### `admin_prompt_service.py`
Full CRUD for speaking and writing prompts:
- `create_prompt` — validates task number range, inserts, logs to `AdminAuditLog`
- `update_prompt` — partial update via Pydantic model, bumps `ContentVersion`
- `soft_delete_prompt` — sets `is_active=False`, never hard-deletes
- `manage_anchor` — add/remove Band-12 calibration samples on a prompt

### `admin_asset_service.py`
- `upload_asset(file, uploader_user_id)` — validates MIME type, uploads to S3,
  inserts `ContentAsset` row, returns public-accessible URL
- `delete_asset(asset_id)` — removes from S3 and DB atomically

### `admin_material_service.py`
CRUD for `LearningMaterial` rows linked to specific task numbers. Each material
can have multiple `MaterialAsset` attachments (PDFs, images).

### `admin_versioning_service.py`
Records a `ContentVersion` snapshot on every prompt update. Allows the admin
to audit the change history of any prompt.

### `admin_audit_service.py`
Writes to `AdminAuditLog` on every mutating admin operation:
```python
await log_admin_action(db, admin_user_id, action="prompt.create", entity_id=prompt_id)
```

### `sanitizer.py`
Used before storing essay text:
- Strips HTML tags via regex
- Removes invisible unicode characters (zero-width spaces, BOM, etc.)
- Collapses repeated whitespace
- Enforces `ESSAY_MIN_CHARS` / `ESSAY_MAX_CHARS` bounds
