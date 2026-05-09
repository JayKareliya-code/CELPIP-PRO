# CELPIP PRO — Celery Workers & Background Tasks

**Author:** Senior Software Engineer  
**Location:** `apps/api/app/workers/`  
**Broker & Backend:** Redis (`REDIS_URL`)  
**File:** `workers/celery_app.py`

---

## 1. Celery Application Setup

The Celery app is configured as a **module-level singleton** in `celery_app.py`
and imported in `main.py` to ensure `shared_task` decorators bind to the
correct broker at startup.

### Queue Topology

Each worker type runs in an **isolated queue** to prevent heavy AI workloads
from blocking lightweight tasks:

| Queue | Worker Module | Purpose |
|-------|--------------|---------|
| `speaking` | `speaking_tasks.py` | Practice speaking attempt scoring |
| `writing` | `writing_tasks.py` | Practice writing attempt scoring |
| `mock_exam` | `mock_exam_tasks.py` | Full 8-task speaking mock exam scoring |
| `writing_mock` | `writing_mock_tasks.py` | Full writing mock exam scoring |
| `reconciliation` | `reconciliation_tasks.py` | Nightly Stripe ↔ DB plan sync |
| `export` | `export_tasks.py` | GDPR data export jobs |
| `transcode` | `transcode_tasks.py` | WebM → M4A audio transcoding |

### Global Worker Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| `task_acks_late` | `True` | Acknowledge only after task completes — prevents message loss if worker dies |
| `task_reject_on_worker_lost` | `True` | Requeues task if the worker process is killed mid-execution |
| `worker_prefetch_multiplier` | `1` | One task per worker process at a time — prevents queue starvation |
| `task_track_started` | `True` | Records task start time in result backend |
| `result_expires` | `86400` (24h) | Celery result TTL in Redis |
| `task_serializer` | `json` | Safe serialisation (no pickle) |

### Beat Scheduler (Periodic Tasks)

| Schedule Name | Task | Frequency |
|--------------|------|-----------|
| `reconcile-stripe-nightly` | `reconciliation_tasks.reconcile_stripe_plans` | Daily at 02:00 UTC |
| `poll-queue-depths` | `metrics_polling.poll_queue_depths` | Every 30 seconds |

Beat writes its schedule DB to `/tmp/celerybeat-schedule` (writable by
non-root container users on managed hosting platforms like Render).

---

## 2. `speaking_tasks.py` — Speaking Scoring Worker

**Queue:** `speaking`

```python
@shared_task(
    name="app.workers.speaking_tasks.score_speaking_attempt",
    queue="speaking",
    acks_late=True,
    max_retries=3,
    default_retry_delay=30,
)
def score_speaking_attempt(attempt_id: str) -> dict:
    ...
```

**Input:** `attempt_id` (string UUID)  
**Process:**
1. Creates a **new async engine** scoped to this worker process via `@lru_cache`
   (each Celery ForkPoolWorker runs on a single persistent event loop)
2. Calls `run_speaking_pipeline(attempt_id)` — the full 10-step AI pipeline
3. On failure: sets `attempt.status = "failed"`, stores `error_message`

**Output:** `{ "status": "complete", "estimated_band": 8.5 }`

### Async in Celery
Celery workers are synchronous by default. The speaking pipeline is async,
so each task spins up a **dedicated event loop** per task via
`core/async_worker.py`:

```python
def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
```

---

## 3. `writing_tasks.py` — Writing Scoring Worker

**Queue:** `writing`

Identical structure to `speaking_tasks.py`. Calls `run_writing_pipeline(attempt_id)`.

**Input:** `attempt_id`  
**Output:** `{ "status": "complete", "estimated_band": 7.0 }`

---

## 4. `mock_exam_tasks.py` — Speaking Mock Exam Worker

**Queue:** `mock_exam` (dedicated — never blocked by practice tasks)

```python
@shared_task(
    name="app.workers.mock_exam_tasks.score_mock_exam_attempt",
    queue="mock_exam",
    ...
)
def score_mock_exam_attempt(attempt_id: str) -> dict:
    ...
```

Calls `run_mock_exam_pipeline(attempt_id)`.

Key difference from practice scoring: loads all 8 attempt rows for the
session and generates both per-task scores and a session-aggregate report.

---

## 5. `writing_mock_tasks.py` — Writing Mock Exam Worker

**Queue:** `writing_mock`

Calls `run_writing_mock_pipeline(attempt_id)`. Processes both Writing Task 1
and Task 2 for a given mock exam session and generates a combined report.

---

## 6. `transcode_tasks.py` — Audio Transcoding Worker

**Queue:** `transcode`

### Purpose
Converts raw WebM audio uploaded by the browser into M4A (AAC) format
for cross-browser playback (Safari does not support WebM natively).

**Triggered by:** `POST /speaking/attempts/{id}/complete` — runs in parallel
with the scoring pipeline so transcoding doesn't block report delivery.

```python
@shared_task(name="app.workers.transcode_tasks.transcode_audio_to_m4a", ...)
def transcode_audio_to_m4a(attempt_id: str) -> dict:
    ...
```

**Flow:**
```
1. Download raw.webm from S3 (stream to temp file)
2. Run ffmpeg: webm → m4a (AAC, 128k, mono)
3. Upload transcoded.m4a to S3
4. UPDATE speaking_attempts SET audio_m4a_s3_key = '...'
5. Cleanup temp files
```

**Output:** `{ "m4a_key": "audio/{attempt_id}/transcoded.m4a" }`  
**Dependency:** `ffmpeg` must be installed in the worker container.

---

## 7. `reconciliation_tasks.py` — Nightly Stripe Reconciliation

**Queue:** `reconciliation`  
**Schedule:** Daily at 02:00 UTC  
**Pattern:** Synchronous (uses standard SQLAlchemy engine, not async)

### Purpose
Acts as a **safety net** for missed Stripe webhooks. Walks every paid user,
calls Stripe to verify payment status, and downgrades users whose payment
was refunded but whose `plan` column was never reset.

### Flow

```
1. SELECT users JOIN subscriptions WHERE plan != 'starter' AND status = 'active'
2. For each user:
   a. stripe.PaymentIntent.retrieve(pi_id, expand=["charges.data"])
   b. If pi.status == "canceled" OR charge.refunded == True:
      → UPDATE users SET plan = 'starter'
      → UPDATE subscriptions SET status = 'refunded'
      → Sentry warning capture
3. INSERT reconciliation_runs audit row (always, even on partial failure)
```

### Return Value
```json
{
  "users_checked": 42,
  "corrections_made": 1,
  "error_message": null
}
```

### Design Notes
- **Idempotent:** Running twice produces the same result (UPDATE is safe to repeat)
- **One Stripe API call per paid user** — acceptable at 1k–10k MAU; add Redis
  cache (TTL 24h) if this needs to run more frequently
- `max_retries=0` — each run is a full sweep; partial retries could cause
  inconsistency

---

## 8. `export_tasks.py` — GDPR Data Export Worker

**Queue:** `export`

### Purpose
Generates a ZIP archive of all user data (attempts, scores, feedback, profile)
for GDPR "right to access" requests.

```python
@shared_task(name="app.workers.export_tasks.generate_user_export", ...)
def generate_user_export(job_id: str, user_id: str) -> dict:
    ...
```

**Flow:**
```
1. Load all Attempt + ScoreReport + FeedbackReport rows for the user
2. Serialize to JSON/CSV
3. Create in-memory ZIP archive
4. Upload to S3: exports/{job_id}/data.zip
5. UPDATE export_jobs SET status='complete', download_url=presigned_get(key, 3600)
```

**Output:** `{ "download_url": "https://s3.../exports/..." }`  
The frontend polls `GET /users/me/export/{job_id}` until `status == "complete"`.

---

## 9. `metrics_polling.py` — Queue Depth Gauge

**Schedule:** Every 30 seconds

### Purpose
Samples Celery queue depths (number of unacknowledged tasks) and updates
a Prometheus gauge `celpip_queue_depth{queue="speaking"}`. This feeds
the Grafana dashboard for worker autoscaling decisions.

```python
@shared_task(name="app.workers.metrics_polling.poll_queue_depths", ...)
def poll_queue_depths() -> None:
    for queue_name in QUEUES:
        depth = redis.llen(queue_name)
        QUEUE_DEPTH_GAUGE.labels(queue=queue_name).set(depth)
```

**Queues monitored:** `speaking`, `writing`, `mock_exam`, `writing_mock`,
`reconciliation`, `export`, `transcode`.
