# CELPIP PRO — Repository Layer

**Author:** Senior Software Engineer  
**Location:** `apps/api/app/repositories/`  
**Pattern:** Repository Pattern — abstracts all raw DB queries away from service and route layers

---

## 1. Overview

The repository layer is the **only place** that writes raw SQL or SQLAlchemy
`select()` / `update()` / `insert()` statements. Services call repositories;
routes call services. This keeps business logic clean and makes the query
layer independently testable.

All repositories inherit from `BaseRepository` and receive an injected
`AsyncSession`. They never commit — commits are owned by the route handler
or service orchestrator.

```
Route Handler
    ↓ Depends(get_db)
Service Layer
    ↓ repo = SomeRepository(db)
Repository
    ↓ db.execute(select(...))
PostgreSQL
```

---

## 2. `base.py` — `BaseRepository`

```python
class BaseRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
```

Provides the shared `db` session. All child repositories extend this class.

---

## 3. `attempt_repo.py` — `AttemptRepository`

The most query-intensive repository. Handles quota counting, history
pagination, and attempt lookup.

### `count_distinct_prompts(user_id, skill, task_number)` → `int`

**Purpose:** Quota check — counts how many DISTINCT prompts a user has
attempted for a given task (not total attempts).

```sql
SELECT COUNT(DISTINCT prompt_id)
FROM   attempts
WHERE  user_id    = :user_id
AND    skill      = :skill
AND    task_number = :task_number
AND    is_mock_test = false
```

**Called by:** `enforce_quota()` in `core/quota.py`  
**Index used:** `idx_attempts_quota (user_id, skill, task_number)`

---

### `has_used_prompt(user_id, skill, prompt_id)` → `bool`

**Purpose:** Redo check — returns `True` if the user has already attempted
this exact prompt (any status). If `True`, quota is not charged.

```sql
SELECT 1 FROM attempts
WHERE user_id = :uid AND skill = :skill AND prompt_id = :pid
LIMIT 1
```

---

### `count_distinct_mock_slots(user_id, skill)` → `int`

**Purpose:** Mock exam quota check — counts how many distinct exam slots the
user has started (not total attempts per slot).

```sql
SELECT COUNT(DISTINCT mock_exam_number)
FROM   attempts
WHERE  user_id      = :user_id
AND    skill        = :skill
AND    is_mock_test = true
```

**Index used:** `idx_attempts_mock (user_id, skill, is_mock_test)`

---

### `has_used_mock_slot(user_id, skill, mock_exam_number)` → `bool`

**Purpose:** Mock exam redo check — returns `True` if the user has already
started this exam slot. Re-entering the same slot is always free.

```sql
SELECT 1 FROM attempts
WHERE user_id = :uid AND skill = :skill
AND   mock_exam_number = :slot AND is_mock_test = true
LIMIT 1
```

---

### `get_history_page(user_id, filters, page, limit)` → `tuple[list[Attempt], int]`

**Purpose:** Paginated attempt history with optional filters.

**Filters supported:**
- `skill`: `speaking` / `writing` / `all`
- `is_mock_test`: bool
- `task_number`: int

```sql
SELECT a.*, sr.estimated_band
FROM   attempts a
LEFT JOIN score_reports sr ON sr.attempt_id = a.id
WHERE  a.user_id = :uid
  AND  a.skill   = :skill          -- if filter set
  AND  a.is_mock_test = :mock      -- if filter set
  AND  a.task_number  = :task      -- if filter set
ORDER BY a.created_at DESC
LIMIT  :limit OFFSET :offset
```

**Returns:** `(items, total_count)` — total is a separate `COUNT(*)` query
to support pagination UI.

---

### `get_attempt_with_score(attempt_id, user_id)` → `AttemptWithScore | None`

**Purpose:** Loads a single attempt with its score report in one join,
verifying ownership.

```sql
SELECT a.*, sr.estimated_band, sr.likely_range, sr.schema_version
FROM   attempts a
LEFT JOIN score_reports sr ON sr.attempt_id = a.id
WHERE  a.id = :attempt_id AND a.user_id = :user_id
```

Returns `None` if not found or not owned by the user (no 404 leak).

---

### `get_quota_summary(user_id, skill)` → `dict`

**Purpose:** Aggregates quota usage for all tasks in one query (used by
`GET /users/me/quota`).

```sql
SELECT   task_number,
         COUNT(DISTINCT prompt_id) AS distinct_prompts
FROM     attempts
WHERE    user_id      = :uid
AND      skill        = :skill
AND      is_mock_test = false
GROUP BY task_number
```

Returns `{ task_number: distinct_count }` mapping — merged with plan limits
in the service layer to produce the full quota response.

---

## 4. `prompt_repo.py` — `PromptRepo`

### `get_practice_prompts(task_number, skill, user_id, page, limit)` → `list[PromptRow]`

Returns active practice prompts for a task, annotated with a per-user
`has_been_attempted` flag via a `LEFT JOIN` on `attempts`.

```sql
SELECT p.*,
       CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS has_been_attempted
FROM   speaking_prompts p
LEFT JOIN attempts a
    ON a.prompt_id = p.id AND a.user_id = :uid
WHERE  p.task_number = :task AND p.is_active = true
   AND p.exam_slot IS NULL
ORDER BY p.created_at DESC
LIMIT  :limit OFFSET :offset
```

---

### `get_mock_exam_prompts(slot, skill)` → `list[PromptRow]`

Returns exactly 8 prompts for the given exam slot, ordered by task number.

```sql
SELECT * FROM speaking_prompts
WHERE  exam_slot = :slot AND is_active = true
ORDER  BY task_number ASC
```

Raises `PromptSetIncompleteError` if fewer than 8 rows are returned
(triggers "Coming Soon" response in the service layer).

---

### `get_prompt_by_id(prompt_id)` → `PromptRow | None`

Simple primary key lookup. Used by the AI pipeline to load prompt context.

---

### `get_previous_best_band(user_id, prompt_id)` → `float | None`

Used by the report service to compute the `band_change` progress delta.

```sql
SELECT MAX(sr.estimated_band)
FROM   attempts a
JOIN   score_reports sr ON sr.attempt_id = a.id
WHERE  a.user_id   = :uid
AND    a.prompt_id = :pid
AND    a.status    = 'complete'
```

---

## 5. `admin_prompt_repo.py` — `AdminPromptRepository`

Extends prompt queries with admin-specific capabilities:

### Key Methods

| Method | SQL Summary | Purpose |
|--------|------------|---------|
| `list_prompts_admin(task, skill, page, limit)` | `SELECT * ... ORDER BY created_at DESC` | Paginated admin table (includes inactive) |
| `create_prompt(data)` | `INSERT INTO speaking_prompts` | Inserts new prompt row |
| `update_prompt(id, data)` | `UPDATE speaking_prompts SET ...` | Partial field update |
| `soft_delete(id)` | `UPDATE SET is_active = false` | Never hard-deletes |
| `get_all_task_counts()` | `SELECT task_number, COUNT(*) GROUP BY task_number` | Task summary cards in admin UI |

---

## 6. `admin_asset_repo.py` — `AdminAssetRepository`

| Method | Purpose |
|--------|---------|
| `create_asset(key, url, uploader_id)` | Inserts `ContentAsset` row after S3 upload |
| `list_assets(page, limit)` | Paginated asset browser |
| `delete_asset(asset_id)` | Removes DB row (S3 deletion handled by service layer) |
| `get_asset_by_key(s3_key)` | Lookup by S3 object key |

---

## 7. `admin_material_repo.py` — `AdminMaterialRepository`

| Method | Purpose |
|--------|---------|
| `create_material(data)` | Inserts `LearningMaterial` + optional `MaterialAsset` attachments |
| `list_materials(task_number)` | Returns materials for a specific task |
| `update_material(id, data)` | Partial update |
| `delete_material(id)` | Hard delete (materials are not versioned) |
| `link_to_task(material_id, task_number)` | Creates `LearningMaterialTaskLink` row |

---

## 8. `user_repo.py` — `UserRepository`

Thin wrapper — most user operations are handled directly in `user_service.py`
via the ORM. The repo provides:

| Method | Purpose |
|--------|---------|
| `get_by_clerk_id(clerk_user_id)` | Primary lookup used by `get_or_create_user` |
| `get_paid_users_with_subscriptions()` | Used by reconciliation task to fetch users needing Stripe verification |

---

## 9. Query Performance Notes

| Query | Index | Avg Cost |
|-------|-------|----------|
| Quota: distinct prompt count | `idx_attempts_quota` | O(log n) |
| Quota: mock slot count | `idx_attempts_mock` | O(log n) |
| History page | `attempts.user_id` + `created_at` | O(log n + page size) |
| Redo check (prompt) | `attempts.user_id + prompt_id` | O(1) with index |
| Report join | `score_reports.attempt_id` (PK) | O(1) |

All quota-critical queries run inside a **PostgreSQL advisory lock** transaction
(acquired in `core/quota.py`) to prevent the read-then-insert race condition
under concurrent requests from the same user.
