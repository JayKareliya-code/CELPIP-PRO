# CELPIP PRO — Pydantic Schemas (API Contract Layer)

**Author:** Senior Software Engineer  
**Location:** `apps/api/app/schemas/`  
**Framework:** Pydantic v2

---

## 1. Overview

Schemas define the **API contract** — what the frontend sends and what it
receives back. They are separate from SQLAlchemy models (ORM layer) by design,
following the Repository → Service → Schema separation of concerns.

All response schemas use `model_config = ConfigDict(from_attributes=True)`
to allow direct construction from ORM row objects.

---

## 2. `schemas/attempt.py` — Attempt Schemas

### Request Schemas (Input)

#### `SpeakingAttemptCreate`
Used by `POST /speaking/attempts`

| Field | Type | Validation |
|-------|------|-----------|
| `prompt_id` | `UUID` | Required |
| `task_number` | `int` | 1–8 |
| `is_mock_test` | `bool` | Default `False` |
| `mock_exam_number` | `int \| None` | Required when `is_mock_test=True` |

#### `WritingAttemptCreate`
Used by `POST /writing/attempts`

| Field | Type | Validation |
|-------|------|-----------|
| `prompt_id` | `UUID` | Required |
| `task_number` | `int` | 1–2 |
| `is_mock_test` | `bool` | Default `False` |

#### `WritingSubmit`
Used by `POST /writing/attempts/{id}/submit`

| Field | Type | Validation |
|-------|------|-----------|
| `essay_text` | `str` | `min_length=1`, `max_length=8000` |
| `word_count` | `int` | `ge=0` |
| `auto_submitted` | `bool` | Default `False` |

### Response Schemas (Output)

#### `AttemptCreatedResponse`
Returned after `POST /speaking/attempts`

```json
{
  "attempt_id": "uuid",
  "upload_url": "https://s3.../...",
  "expires_in": 900
}
```

#### `AttemptStatusResponse`
Returned by `GET /attempts/{id}/status`

```json
{
  "attempt_id": "uuid",
  "status": "complete",
  "estimated_band": 8.5,
  "celery_task_id": "...",
  "error_message": null
}
```

#### `AttemptDetailResponse`
Full attempt record for history and status page:

| Field | Type | Description |
|-------|------|-------------|
| `attempt_id` | UUID | |
| `skill` | str | `speaking` / `writing` |
| `task_number` | int | |
| `status` | str | `pending` / `processing` / `complete` / `failed` |
| `is_mock_test` | bool | |
| `mock_exam_number` | int? | |
| `estimated_band` | float? | Null until scoring completes |
| `created_at` | datetime | |

---

## 3. `schemas/report.py` — Report Schemas

### `ScoreDimensionOut`

```json
{
  "dimension": "vocabulary",
  "score": 9,
  "max_score": 12
}
```

### `FeedbackItemOut`

```json
{
  "point": "Strong use of connective phrases",
  "example": "'Furthermore', 'In addition to this'"
}
```

### `StarterReportResponse`
Plan-gated response for Starter users:

```json
{
  "attempt_id": "uuid",
  "estimated_band": 7.5,
  "likely_range": "7–8",
  "dimensions": null,
  "feedback": null,
  "locked": true,
  "upgrade_url": "/billing"
}
```

### `ProReportResponse`
Full report for Pro/Ultra users:

| Field | Type | Description |
|-------|------|-------------|
| `attempt_id` | UUID | |
| `estimated_band` | float | |
| `likely_range` | str? | e.g. `"8–9"` |
| `dimensions` | `list[ScoreDimensionOut]` | 4 items |
| `strengths` | `list[FeedbackItemOut]` | |
| `weaknesses` | `list[FeedbackItemOut]` | |
| `improvement_tips` | `list[TipOut]` | `{ tip, priority }` |
| `sample_response` | str | AI-generated model answer |
| `transcript` | str? | Whisper STT output (speaking only) |
| `audio_url` | str? | Presigned M4A URL (speaking only) |
| `dimension_commentary` | dict? | Per-dimension prose |
| `band_change` | float? | Delta vs previous best attempt |
| `scoring_model` | str | e.g. `gpt-4o-mini` |

---

## 4. `schemas/prompt.py` — Prompt Schemas

### `PromptOut`
Returned in task/prompt listing endpoints:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | |
| `task_number` | int | |
| `prompt_text` | str | |
| `context_image_url` | str? | Presigned image URL (tasks 3/4/8) |
| `prep_time_seconds` | int | |
| `response_time_seconds` | int | |
| `difficulty` | str | `easy` / `medium` / `hard` |
| `has_been_attempted` | bool | Per-user flag |
| `is_locked` | bool | True for Starter plan users |
| `has_parts` | bool | True for multi-part tasks |
| `curveball_option` | str? | Task 5 curveball text |

### `MockExamPromptOut`
Extended `PromptOut` for mock exams, adds:

| Field | Type | Description |
|-------|------|-------------|
| `exam_slot` | int | Slot number (1, 2, …) |
| `task_display_name` | str | Human-readable task title |

---

## 5. `schemas/user.py` — User Schemas

### `UserProfileResponse`
Returned by `GET /users/me`:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Jay K.",
  "plan": "pro",
  "streak_days": 12,
  "target_band": 9.0,
  "tos_accepted": true,
  "tos_version": "2026-04-22",
  "is_admin": false
}
```

### `QuotaResponse`
Returned by `GET /users/me/quota`:

```json
{
  "plan": "pro",
  "speaking": {
    "tasks": {
      "1": { "used": 2, "limit": 5, "unlimited_retries": true },
      "2": { "used": 0, "limit": 5, "unlimited_retries": true }
    },
    "mock_tests": { "used": 1, "limit": 2 }
  },
  "writing": {
    "tasks": { "1": { "used": 3, "limit": 5 } },
    "mock_tests": { "used": 0, "limit": 2 }
  }
}
```

### `ProfileUpdateRequest`
Used by `PUT /users/me/profile`:

| Field | Type | Validation |
|-------|------|-----------|
| `full_name` | `str \| None` | `max_length=128` |
| `target_band` | `float \| None` | `ge=1.0`, `le=12.0` |

---

## 6. `schemas/history.py` — History Schemas

### `HistoryItemOut`

| Field | Type | Description |
|-------|------|-------------|
| `attempt_id` | UUID | |
| `skill` | str | |
| `task_number` | int | |
| `task_name` | str | Human-readable task title |
| `estimated_band` | float? | Null if still processing |
| `status` | str | |
| `is_mock_test` | bool | |
| `created_at` | datetime | |

### `HistoryPageResponse`

```json
{
  "items": [ ...HistoryItemOut ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

## 7. `schemas/common.py` — Shared Schemas

### `ErrorResponse`
Standard error envelope returned on `4xx` / `5xx`:

```json
{
  "detail": "Quota exceeded.",
  "code": "QUOTA_EXCEEDED",
  "used": 4,
  "limit": 5,
  "upgrade_url": "/billing"
}
```

### `PaginatedResponse[T]`
Generic paginated wrapper used across listing endpoints:

```python
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
```

---

## 8. Billing Schemas — `billing/schemas.py`

### `CheckoutRequest`
```json
{ "plan": "pro" }
```
Validates `plan ∈ {"pro", "ultra"}`.

### `CheckoutResponse`
```json
{ "checkout_url": "https://checkout.stripe.com/pay/..." }
```

### `BillingStatusResponse`
```json
{
  "plan": "pro",
  "subscription_status": "active",
  "stripe_customer_id": "cus_...",
  "payment_type": "one_time"
}
```

### `PortalResponse`
```json
{ "portal_url": "https://billing.stripe.com/..." }
```

### `SSETokenResponse`
```json
{ "token": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx", "expires_in": 120 }
```
