# CELPIP PRO — Quota & Plan Enforcement System

**Author:** Senior Software Engineer  
**File:** `apps/api/app/core/quota.py`

---

## 1. Overview

The quota system enforces per-plan usage limits at the API layer, **inside
the attempt creation transaction**, before any AI scoring is triggered.
It uses **PostgreSQL advisory locks** to prevent race conditions when two
concurrent requests from the same user both try to pass the quota check.

---

## 2. Plan Limits

Configured entirely via environment variables in `core/config.py`.

| Plan | Task Practice | Mock Tests (Speaking) | Mock Tests (Writing) |
|------|-------------|----------------------|---------------------|
| `starter` | ❌ Locked (402) | 1 slot | 1 slot |
| `pro` | 20 unique prompts/task | 2 slots | 2 slots |
| `ultra` | 15 unique prompts/task | 5 slots | 5 slots |

> **"unique prompts/task"** = count of DISTINCT `prompt_id` values attempted
> for that task number, NOT total attempts. Retrying the same prompt is always
> free regardless of how many times.

---

## 3. `get_plan_limits(plan, skill)` → `PlanLimits`

**Input:** `plan: str` (`starter` / `pro` / `ultra`), `skill: str` (`speaking` / `writing`)  
**Output:** `PlanLimits(per_task: int | None, mock_tests: int | None)`

```python
@dataclass
class PlanLimits:
    per_task: int | None    # None = unlimited (no practice-mode cap)
    mock_tests: int | None  # None = unlimited; 0 = blocked
```

---

## 4. `enforce_quota(...)` — Main Gate

**Signature:**
```python
async def enforce_quota(
    user: User,
    skill: str,           # "speaking" | "writing"
    task_number: int,
    is_mock_test: bool,
    db: AsyncSession,
    mock_exam_number: int | None = None,
    prompt_id: UUID | None = None,
) -> None
```

**Raises:** `HTTP 402 Payment Required` with structured error body on quota breach.  
**Returns:** `None` silently when quota is satisfied.

### Decision Tree

```
starter + not mock_test?
    → 402 STARTER_TASK_PRACTICE_LOCKED

Acquire pg_advisory_xact_lock(user_id)   ← prevents race conditions

is_mock_test?
    → user already used this mock_exam_number slot?
        → return (redo = free, no quota charge)
    → count DISTINCT slots used >= mock_tests limit?
        → 402 QUOTA_EXCEEDED

not is_mock_test?
    → user already attempted this prompt_id?
        → return (redo = free, unlimited retries)
    → count DISTINCT prompt_ids for this task >= per_task limit?
        → 402 QUOTA_EXCEEDED
```

### Advisory Lock

```sql
SELECT pg_advisory_xact_lock(hashtextextended(:user_id, 0))
```

- Transaction-scoped (auto-released on COMMIT/ROLLBACK)
- Deterministically derived from `user_id` string
- Serialises concurrent `count → insert` pairs for the same user
- Silently skipped under SQLite (test environments)

### HTTP 402 Error Body

```json
{
  "code": "QUOTA_EXCEEDED",
  "used": 4,
  "limit": 5,
  "message": "You have reached the limit of 5 unique prompts for this task.",
  "upgrade_url": "/billing"
}
```

---

## 5. `enforce_mock_exam_plan_access(user)` — Plan Gate

Used for speaking mock exam **uploads** (not creation). Replaces the
previous per-session counter which was incompatible with client-generated
ephemeral session UUIDs.

**Logic:**
- `starter` → `HTTP 402 MOCK_EXAM_LOCKED`
- `pro` / `ultra` → pass through (unlimited upload retries)

This means Pro/Ultra users can re-do and re-upload the same mock exam task
any number of times — consistent with the practice-mode "same prompt = always
free" UX contract.

---

## 6. `core/pubsub.py` — SSE Plan Event Bus

### Problem Solved
Without this module, each SSE connection would open its own Redis `SUBSCRIBE`
command. 100 concurrent users = 100 Redis pubsub clients. `PlanEventBus`
maintains **exactly ONE** Redis subscriber per API worker process and fans
out messages in-process via `asyncio.Queue`.

### Architecture

```
Stripe Webhook
    → redis.publish("celpip:plan_updates:<user_id>", '{"plan": "pro"}')

PlanEventBus._run()  ← single asyncio task per process
    → psubscribe("celpip:plan_updates:*")
    → on pmessage: extract user_id from channel
    → put_nowait(data) into each registered Queue for that user_id

SSE Route Handler
    → q = await bus.subscribe(user_id)
    → msg = await asyncio.wait_for(q.get(), timeout=25)
    → yield SSE event to browser
    → bus.unsubscribe(user_id, q)  ← on connection close
```

### Key Design Points

| Property | Value |
|----------|-------|
| Redis subscribers per process | 1 (pattern subscribe) |
| Queue maxsize | 32 messages per SSE connection |
| Queue full policy | Drop message (log warning) — non-blocking |
| Process safety | Not thread-safe; one instance per event loop (correct for uvicorn multi-worker) |
| Channel pattern | `celpip:plan_updates:*` |

### Lifecycle (wired in `main.py` lifespan)

```python
bus = PlanEventBus(get_redis_pool())
app.state.plan_event_bus = bus
await bus.start()   # startup
# ...
await bus.stop()    # shutdown
```
