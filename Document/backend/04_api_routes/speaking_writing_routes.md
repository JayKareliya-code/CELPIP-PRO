# CELPIP PRO — Speaking & Writing API Routes

**Author:** Senior Software Engineer  
**Files:** `apps/api/app/api/v1/speaking.py`, `writing.py`, `mock_exam.py`, `attempts.py`, `users.py`

---

## 1. Speaking Routes — `speaking.py`

Base path: `/api/v1/speaking`  
Auth: All routes require `get_current_user`

---

### `GET /speaking/tasks`

**Purpose:** Returns the list of all 8 CELPIP speaking tasks with metadata
(name, description, attempt counts for the authenticated user).

**Input:** Bearer token (user identity)  
**Output:**
```json
[
  {
    "task_number": 1,
    "name": "Giving Advice",
    "description": "...",
    "attempts_used": 3,
    "attempts_limit": 5,
    "is_locked": false
  }
]
```
**Notes:** `attempts_used` and `attempts_limit` are computed from the quota
system per user plan. Starter users see `is_locked: true` for all tasks.

---

### `GET /speaking/tasks/{task_number}/prompts`

**Purpose:** Returns paginated practice prompts for a specific task. Only
returns prompts where `is_active=true` and `exam_slot IS NULL` (practice-only).

**Input:** `task_number` (path), `page`, `limit` (query)  
**Output:** `{ prompts: [...], total: int, page: int }`  
**Prompt fields:** `id`, `prompt_text`, `context_image_url`, `prep_time_seconds`,
`response_time_seconds`, `difficulty`, `has_been_attempted` (per user)

---

### `POST /speaking/attempts`

**Purpose:** Creates a new speaking attempt row and returns a **presigned S3 PUT URL**
for the client to upload audio directly to S3/R2.

**Input (JSON body):**
```json
{
  "prompt_id": "uuid",
  "task_number": 1,
  "is_mock_test": false,
  "mock_exam_number": null
}
```

**Processing Flow:**
```
1. enforce_quota(user, skill="speaking", ...)   ← 402 if over limit
2. INSERT Attempt (status=pending)
3. INSERT SpeakingAttempt (upload_completed=false)
4. generate_presigned_put(key=f"audio/{attempt_id}/raw.webm", expires=900s)
5. Return attempt_id + presigned_url
```

**Output:**
```json
{
  "attempt_id": "uuid",
  "upload_url": "https://s3.../audio/uuid/raw.webm?X-Amz-Signature=..."
}
```

---

### `POST /speaking/attempts/{attempt_id}/complete`

**Purpose:** Called by the client after a successful S3 PUT to trigger the
AI scoring pipeline.

**Input:** `attempt_id` (path)  
**Processing:**
```
1. Verify attempt belongs to current user
2. Verify upload_completed = false (idempotency guard)
3. SET upload_completed = true, status = "processing"
4. Enqueue Celery task: score_speaking_attempt.delay(attempt_id)
5. Return { celery_task_id }
```

**Output:** `{ "attempt_id": "uuid", "celery_task_id": "...", "status": "processing" }`

---

### `GET /speaking/attempts/{attempt_id}/status`

**Purpose:** Polling endpoint for attempt processing status.

**Output:**
```json
{
  "status": "complete",
  "estimated_band": 8.5,
  "report_url": "/attempts/uuid/report"
}
```

---

## 2. Writing Routes — `writing.py`

Base path: `/api/v1/writing`  
Same auth and quota pattern as speaking. Key differences:

### `POST /writing/attempts`

**Input:**
```json
{
  "prompt_id": "uuid",
  "task_number": 1,
  "is_mock_test": false
}
```
Returns `attempt_id` only (no presigned URL — essay text is submitted later).

### `POST /writing/attempts/{attempt_id}/submit`

**Purpose:** Submits the essay text and triggers AI scoring.

**Input (JSON body):**
```json
{
  "essay_text": "...",
  "word_count": 287,
  "auto_submitted": false
}
```

**Validation:**
- `essay_text` length: `ESSAY_MIN_CHARS` (1) → `ESSAY_MAX_CHARS` (8000)
- Sanitised via `sanitizer.py` (strips HTML tags / invisible unicode)

**Processing:**
```
1. UPDATE WritingAttempt: essay_text, word_count, char_count, auto_submitted
2. UPDATE Attempt: status = "processing"
3. Enqueue: score_writing_attempt.delay(attempt_id)
```

---

## 3. Mock Exam Routes — `mock_exam.py`

Base path: `/api/v1/mock-exam`

### `GET /mock-exam/slots`

Returns all available exam slots (1, 2, …) with availability status for the
user's plan.

### `GET /mock-exam/slots/{slot}/prompts`

**Purpose:** Returns all 8 prompts for a given exam slot in task order.

**Input:** `slot` (path int), `session_id` (query — stable UUID from client localStorage)  
**Output:** `{ prompts: [8 items], session_id: "uuid" }`

Each prompt includes: `task_number`, `prompt_text`, `context_image_url`,
`prep_time_seconds`, `response_time_seconds`, `has_parts`, `curveball_option`.

### `POST /mock-exam/attempts`

Same as `POST /speaking/attempts` with `is_mock_test=true` and `mock_exam_number` set.

### `POST /mock-exam/attempts/{attempt_id}/complete`

Calls `enforce_mock_exam_plan_access` (plan gate) then enqueues the
`mock_exam_pipeline` Celery task (runs in isolated `mock_exam` queue).

---

## 4. Attempts Routes — `attempts.py`

Base path: `/api/v1/attempts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/attempts/{id}` | GET | Full attempt detail (status, score, feedback) |
| `/attempts/{id}/report` | GET | Detailed score report (plan-gated — Starter sees locked preview) |
| `/attempts/{id}/cancel` | POST | Cancels a pending/processing attempt; marks Celery task as revoked |

---

## 5. Users Routes — `users.py`

Base path: `/api/v1/users`

### `GET /users/me`

Returns current user profile, plan, streak, and TOS status.

**Output:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "plan": "pro",
  "streak_days": 7,
  "target_band": 9.0,
  "tos_accepted": true,
  "tos_version": "2026-04-22"
}
```

### `GET /users/me/quota`

Returns current quota consumption vs limits for the authenticated user.

**Output:**
```json
{
  "plan": "pro",
  "speaking": {
    "tasks": {
      "1": { "used": 2, "limit": 5 },
      ...
    },
    "mock_tests": { "used": 1, "limit": 2 }
  },
  "writing": { ... }
}
```

### `POST /users/me/tos-accept`

Records TOS acceptance. Sets `tos_accepted_at = NOW()` and `tos_version = TOS_CURRENT_VERSION`.
Returns `HTTP 409` if the current version is already accepted.

### `PUT /users/me/profile`

Updates `full_name` and `target_band`. Input validated via Pydantic schema.

### `GET /users/me/export`

Enqueues a GDPR data export Celery task. Returns `{ job_id }` for polling.
Rate-limited to 1 export per 24 hours per user.

---

## 6. History Routes — `history.py`

Base path: `/api/v1/history`

### `GET /history`

**Query params:** `skill` (`speaking`/`writing`/`all`), `is_mock_test` (bool),
`task_number` (int), `page`, `limit`

**Output:** Paginated list of attempts with score summaries:
```json
{
  "items": [
    {
      "attempt_id": "uuid",
      "skill": "speaking",
      "task_number": 3,
      "estimated_band": 8.0,
      "status": "complete",
      "created_at": "2026-05-01T10:23:00Z"
    }
  ],
  "total": 42,
  "page": 1
}
```

---

## 7. Reports Routes — `reports.py`

Base path: `/api/v1/reports`

### `GET /reports/{attempt_id}`

Returns the full scored report. Plan-gated:

| Plan | Access |
|------|--------|
| Starter | Overall band + locked preview cards |
| Pro / Ultra | Full 4-dimension breakdown + feedback + sample response + transcript analysis |
