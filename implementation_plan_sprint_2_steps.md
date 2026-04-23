# CELPIP PRO — Sprint 2 Execution Plan (4 Steps)

> Source plan: `D:\Projects\CELPIP PRO\implementation_plan_sprint_2`
> Audit context: `D:\Projects\CELPIP PRO\CELPIP Prep — Production Launch Rea.txt`
> Repo root: `D:\Projects\CELPIP PRO`
> Sprint 1 status: **complete** (verified — `0010_subscription_semantics.py`, `app/core/logging_config.py`, `app/core/middleware.py`, `app/core/rate_limit.py` all present).

This document is the durable handoff between sessions. Each step lists files to touch, exact actions, new deps, migrations, and a verification checklist. Run `git status` + `git log --oneline -5` at the start of each step to confirm prior step landed cleanly.

---

## Repo facts to remember (so we don't re-derive)

- Admin endpoints live as **flat files** under `apps/api/app/api/v1/`, not in an `admin/` subdir. Files: `admin.py`, `admin_assets.py`, `admin_audit.py`, `admin_materials.py`, `admin_prompts.py`, `admin_tags.py`. Plan-document paths like `apps/api/app/api/v1/admin/cost_report.py` should be created as `apps/api/app/api/v1/admin_cost_report.py` (or a new `admin/` package — pick once, stick to it).
- Workers live in `apps/api/app/workers/`. Existing: `celery_app.py`, `mock_exam_tasks.py`, `speaking_tasks.py`, `writing_mock_tasks.py`, `writing_tasks.py`. New worker files (`reconciliation_tasks.py`, `export_tasks.py`, `transcode_tasks.py`) go here.
- Pipelines live in `apps/api/app/services/ai/pipeline/` (per audit doc).
- Storage helpers: `apps/api/app/services/storage/presigner.py` exists. `storage_service.py` (top-level) also exists — confirm which one owns presigning before editing.
- Latest Alembic revision is `0010_subscription_semantics.py`. Next IDs: `0011_*`, `0012_*`, `0013_*`. Plan doc accidentally reuses `0011` for two migrations — renumber: `0011_reconciliation_log`, `0012_export_jobs`, `0013_audio_m4a_key`.
- Frontend has **no** `dangerouslySetInnerHTML` usage today (grep returned zero hits). S2-5 frontend work is reduced to a "no-op + add server-side bleach + add DOMPurify dep defensively for future markdown render."
- Billing routes live under `apps/api/app/api/v1/billing/routes/` (per audit doc — `events.py`, `webhook.py`, `portal.py`, etc.).
- `ai_cost_log` table already exists (per audit §P2-9) — S2-9 is read-only query work.
- Payment model is **one-time only** (Sprint 1 dropped `current_period_end` / `canceled_at`, added `stripe_payment_intent_id`, `payment_type`). Reconciliation must use `PaymentIntent.retrieve`, not `Subscription.retrieve`.

---

## Step 1 — Week 1: Quick Wins (zero new infra)

**Goal:** Ship 4 security/perf items with no new containers, no new migrations, minimal new deps.
**Items:** S2-5, S2-13, S2-12, S2-10
**New backend deps:** `bleach>=6.1.0`
**New frontend deps:** `dompurify`, `@types/dompurify` (defensive — no current render sites)
**Migrations:** none
**Estimated diff size:** ~10 files

### S2-5 — Stored-XSS Review (Admin Markdown)

1. **[AUDIT]** Re-run `grep -rn dangerouslySetInnerHTML apps/web/` to confirm zero hits at execution time. If new hits appear since this plan, wrap each in `DOMPurify.sanitize(...)`.
2. **[NEW]** `apps/api/app/services/sanitizer.py` — wrapper around `bleach.clean(...)` with allowlist: tags `[p, br, strong, em, ul, ol, li, h1..h4, code, pre, a, blockquote]`, attrs `{a: [href, title]}`, strip on disallowed.
3. **[MODIFY]** `apps/api/app/api/v1/admin_prompts.py` — call sanitizer on `prompt_text` (and any other free-text body fields) before persist in create/update handlers.
4. **[MODIFY]** `apps/api/app/api/v1/admin_materials.py` — same treatment for `body_markdown`.
5. **[MODIFY]** `apps/api/requirements.txt` — add `bleach>=6.1.0`.
6. **[MODIFY]** `apps/web/package.json` — add `dompurify`, `@types/dompurify` (devDependency for the types).

### S2-13 — Flower Auth + Production Hardening

1. **[MODIFY]** `docker-compose.yml` — add `--basic_auth=admin:${FLOWER_PASSWORD}` to the Flower service `command:`. Add `FLOWER_PASSWORD` to environment block (referenced from `.env`).
2. **[MODIFY]** `apps/api/.env.example` — add `FLOWER_PASSWORD=changeme`.
3. **[NEW]** `docs/ops.md` — short runbook: Flower must be on internal VPC only, never publicly routable; how to rotate the password; how to view queues without exposing the port.

### S2-12 — Prompt Image Signed URL Caching

1. **[MODIFY]** `apps/api/app/services/storage/presigner.py` — add `async def generate_presigned_get_cached(key: str, expires_in: int, redis) -> str`:
   - Key: `presign:{md5(key)}:{expires_in}`
   - TTL: `expires_in - 300` (5-min safety margin)
   - On miss: call existing presigner, `SETEX`, return.
2. **[MODIFY]** `apps/api/app/api/v1/speaking.py` — find `_sign_prompt()` helper; route through cached version. Inject `redis` via existing dep.
3. **[VERIFY]** No regressions in `GET /speaking/tasks` payload shape.

### S2-10 — Admin Audit Wiring Verification

1. **[AUDIT]** `grep -rn admin_audit_service apps/api/app/api/v1/` — list call sites.
2. **[AUDIT]** For each admin mutating endpoint in `admin.py`, `admin_prompts.py`, `admin_materials.py`, `admin_assets.py`, `admin_tags.py` — confirm a call to `admin_audit_service.log(...)` exists.
3. **[MODIFY]** Add missing audit calls. Standard payload: `{actor_user_id, action, target_type, target_id, before, after}`.
4. **[NEW]** `apps/api/tests/test_admin_audit.py` — integration test: spin up test client as admin, call each mutating endpoint, assert one row in `admin_audit_log` per call.

### Step 1 Verification

- `pytest apps/api/` green (incl. new test_admin_audit).
- `docker compose up flower` requires basic auth.
- Re-fetch `/speaking/tasks` twice — second call should hit Redis cache (verify via `redis-cli MONITOR`).
- `grep dangerouslySetInnerHTML apps/web/` still zero hits OR all wrapped in `DOMPurify.sanitize`.

### Step 1 Commit Strategy

One commit per item: `s2-5: bleach-sanitize admin markdown`, `s2-13: flower basic auth`, `s2-12: cache prompt image presigned URLs`, `s2-10: backfill admin audit calls + test`.

---

## Step 2 — Week 2: Billing + Ops

**Goal:** Reconciliation, cost visibility, feature flags. Touches billing path — extra care.
**Items:** S2-2, S2-9, S2-3
**New backend deps:** `UnleashClient>=5.2.0` (optional — env-var fallback works without it)
**Migrations:** `0011_reconciliation_log.py` (one migration)
**Estimated diff size:** ~12 files

### S2-2 — Stripe ↔ DB Reconciliation Cron

1. **[NEW]** `apps/api/alembic/versions/0011_reconciliation_log.py`:
   ```
   reconciliation_runs(
     id UUID PK,
     run_at TIMESTAMPTZ NOT NULL,
     users_checked INTEGER NOT NULL,
     corrections_made INTEGER NOT NULL,
     error_message TEXT NULL
   )
   ```
   `down_revision = '0010_subscription_semantics'`
2. **[NEW]** `apps/api/app/models/reconciliation_run.py` — SQLAlchemy model.
3. **[NEW]** `apps/api/app/workers/reconciliation_tasks.py` — `@shared_task` `reconcile_stripe_plans`:
   - Query users where `plan != 'starter'`.
   - For each: look up `Subscription` row → `stripe_payment_intent_id` → `stripe.PaymentIntent.retrieve(pi_id)`.
   - If PI status indicates refund (check both `status == 'canceled'` and `charges.data[0].refunded == True`) and user is still on paid plan → downgrade to `starter`, log to structlog + Sentry.
   - Insert `reconciliation_runs` row at end.
4. **[MODIFY]** `apps/api/app/workers/celery_app.py` — add Beat schedule entry: `'reconcile-stripe-nightly': { 'task': 'app.workers.reconciliation_tasks.reconcile_stripe_plans', 'schedule': crontab(hour=2, minute=0) }`.
5. **[MODIFY]** `docker-compose.yml` — confirm a `celery-beat` service exists; if only `celery-worker`, add `beat` service running `celery -A app.workers.celery_app beat`.
6. **[NEW]** `apps/api/tests/test_reconciliation.py` — mock Stripe client, assert downgrade happens for refunded PI.

### S2-9 — Per-User AI Cost Dashboard

1. **[NEW]** `apps/api/app/api/v1/admin_cost_report.py`:
   - `GET /admin/cost-report?from=YYYY-MM-DD&to=YYYY-MM-DD`
   - Guarded by `require_admin`.
   - Aggregates `ai_cost_log`: `total_usd`, `by_model: {model: usd}`, `by_user: [{user_id, email, plan, total_usd, total_tokens}]`, `by_operation: {operation: usd}`.
   - Cap user list at top 100 by spend; add `?limit` param.
2. **[MODIFY]** `apps/api/app/api/v1/__init__.py` (or wherever the router is mounted) — register the new route.
3. **[NEW]** `apps/web/app/(admin)/cost-report/page.tsx`:
   - Table with sortable columns (User, Plan, Tokens, USD).
   - Date range picker (default: last 30 days).
   - Bar chart (Recharts — confirm dep already present; if not, add to package.json) of daily cost by model.
4. **[MODIFY]** Admin nav — add "Cost Report" link.

### S2-3 — Feature Flags

1. **[NEW]** `apps/api/app/core/feature_flags.py`:
   - `is_enabled(flag: str, context: dict | None = None) -> bool`
   - If `settings.UNLEASH_URL` set → use `UnleashClient`.
   - Else parse `settings.FEATURE_FLAGS_JSON` (string → dict[str, bool]).
   - Module-level singleton init lazily.
2. **[MODIFY]** `apps/api/app/core/config.py` — add `UNLEASH_URL: str = ""`, `UNLEASH_TOKEN: str = ""`, `FEATURE_FLAGS_JSON: str = "{}"`.
3. **[NEW]** `apps/api/app/api/v1/feature_flags.py` — `GET /feature-flags` (auth required) → `{ flags: {...} }`. Returns flat dict of all known flag evaluations for the requesting user (use user_id + plan as Unleash context).
4. **[NEW]** `apps/web/lib/hooks/useFeatureFlags.ts`:
   - TanStack Query against `/feature-flags`, `staleTime: 60_000`.
   - Export `useIsEnabled(flag: string): boolean`.
5. **[MODIFY]** `apps/api/requirements.txt` — `UnleashClient>=5.2.0` (optional dep — make import conditional in `feature_flags.py`).

### Step 2 Verification

- `alembic upgrade head` runs cleanly; `alembic check` passes.
- Manual: trigger reconciliation task in dev (`celery -A app.workers.celery_app call app.workers.reconciliation_tasks.reconcile_stripe_plans`); verify `reconciliation_runs` row written.
- `GET /admin/cost-report?from=...&to=...` returns expected aggregates against seeded `ai_cost_log` data.
- `GET /feature-flags` returns env-var flags when `FEATURE_FLAGS_JSON='{"new_essay_prompt": true}'`.

### Step 2 Commit Strategy

One commit per item: `s2-2: nightly stripe reconciliation cron`, `s2-9: admin AI cost dashboard`, `s2-3: feature flags scaffolding`.

---

## Step 3 — Week 3: Scalability + Observability

**Goal:** Metrics, traces, SSE fan-out, staging pipeline. **No payment-path changes** — safer to run in parallel with billing review.
**Items:** S2-1, S2-6, S2-11
**New backend deps:** `prometheus-fastapi-instrumentator>=0.9.0`, `opentelemetry-sdk>=1.24.0`, `opentelemetry-instrumentation-fastapi>=0.45b0`, `opentelemetry-exporter-otlp>=1.24.0`
**Migrations:** none
**New compose services:** `prometheus`, `grafana`
**Estimated diff size:** ~15 files

### S2-1 — Prometheus Metrics + OpenTelemetry Tracing

1. **[NEW]** `apps/api/app/core/metrics.py`:
   - `attempt_total = Counter('celpip_attempt_total', ['skill', 'status', 'plan'])`
   - `ai_cost_usd_total = Counter('celpip_ai_cost_usd_total', ['model', 'operation'])`
   - `queue_depth = Gauge('celpip_queue_depth', ['queue'])`
   - `setup_otel(app)` — configure OTLP exporter from `OTEL_EXPORTER_OTLP_ENDPOINT` (skip silently if empty), instrument FastAPI + SQLAlchemy.
2. **[MODIFY]** `apps/api/app/main.py`:
   - `from prometheus_fastapi_instrumentator import Instrumentator`
   - `Instrumentator().instrument(app).expose(app, endpoint='/metrics', include_in_schema=False)`
   - Call `setup_otel(app)` in lifespan startup.
3. **[NEW]** `apps/api/app/workers/metrics_polling.py` — Beat task every 30s: read Celery queue lengths from Redis (`LLEN celery_<queue>`) → set `queue_depth` gauge. Add to Beat schedule.
4. **[MODIFY]** Hook `attempt_total.inc(...)` at key state transitions in `attempt_service.py` (start, complete, fail). Hook `ai_cost_usd_total.inc(amount, ...)` wherever `ai_cost_log` is written (find with grep).
5. **[MODIFY]** `docker-compose.yml` — add `prometheus` service (config in `infra/prometheus.yml` scraping `api:8000/metrics`) and `grafana` service (provisioned datasource + dashboard JSON).
6. **[NEW]** `infra/prometheus.yml`, `infra/grafana/datasources.yml`, `infra/grafana/dashboards/celpip.json` — minimal pre-loaded dashboard with API p99, queue depth, AI cost rate.
7. **[MODIFY]** `apps/api/app/core/config.py` — add `OTEL_EXPORTER_OTLP_ENDPOINT: str = ""`, `METRICS_AUTH_TOKEN: str = ""`. Optionally guard `/metrics` by header token in non-dev.

### S2-6 — Shared Redis Pub/Sub for SSE Fan-out

1. **[NEW]** `apps/api/app/core/pubsub.py`:
   ```python
   class PlanEventBus:
       def __init__(self, redis):
           self._redis = redis
           self._subs: dict[str, set[asyncio.Queue]] = defaultdict(set)
           self._task: asyncio.Task | None = None

       async def start(self): ...   # subscribes to channel "plan_events:*"
       async def stop(self): ...
       async def subscribe(self, user_id: str) -> asyncio.Queue: ...
       async def unsubscribe(self, user_id: str, q: asyncio.Queue): ...
       async def _run(self): ...    # single pubsub loop dispatching to per-user queues
   ```
   Single Redis subscriber per process; in-process fan-out.
2. **[MODIFY]** `apps/api/app/main.py` — instantiate `PlanEventBus` in lifespan startup, store on `app.state.plan_event_bus`, call `start()`. Stop in shutdown.
3. **[MODIFY]** `apps/api/app/api/v1/billing/routes/events.py`:
   - Replace per-connection `redis.pubsub()` with `bus = request.app.state.plan_event_bus`; `q = await bus.subscribe(user_id)`.
   - Read from `q.get()` in the SSE generator. Always `await bus.unsubscribe(...)` in finally.
4. **[VERIFY]** Open 5 SSE connections from same browser; `redis-cli CLIENT LIST` should show only 1 subscriber per API process (not 5).

### S2-11 — Staging Environment Scaffolding

1. **[NEW]** `apps/api/.env.staging.example` — full template per plan doc (APP_ENV=staging, test Stripe/Clerk keys, staging Sentry DSN, staging CORS).
2. **[MODIFY]** `apps/api/app/core/config.py` — assert `APP_ENV in ('development', 'staging', 'production')` in a Pydantic validator; raise on unknown.
3. **[MODIFY]** `.github/workflows/cd.yml` (created in Sprint 1):
   - `deploy-staging` job: triggers on push to `develop` branch.
   - `deploy-production` job: triggers on push to `main`, `needs: [deploy-staging]`, `environment: production` (GitHub manual approval gate).
4. **[VERIFY]** `gh workflow view cd.yml` shows two jobs with the dependency edge.

### Step 3 Verification

- `curl localhost:8000/metrics` returns Prometheus text format with `celpip_*` counters present.
- Grafana at `localhost:3001` shows the pre-loaded dashboard with live data.
- 10 concurrent SSE connections → `redis-cli CLIENT LIST | wc -l` shows ~1 pubsub client (not 10).
- CI run on a `develop` push only fires `deploy-staging`; `main` push fires both with approval gate.

### Step 3 Commit Strategy

`s2-1: prometheus metrics + OTel tracing`, `s2-6: shared SSE pubsub fan-out`, `s2-11: staging env + CD pipeline`.

---

## Step 4 — Week 4: User-Facing Features

**Goal:** GDPR export, iOS audio compatibility, read-replica wiring (code-only).
**Items:** S2-4, S2-7, S2-8
**Migrations:** `0012_export_jobs.py`, `0013_audio_m4a_key.py`
**Dockerfile change:** `apt-get install -y ffmpeg` in worker stage
**Estimated diff size:** ~14 files

### S2-4 — GDPR Data Export

1. **[NEW]** `apps/api/alembic/versions/0012_export_jobs.py`:
   ```
   export_jobs(
     id UUID PK,
     user_id UUID FK users.id ON DELETE CASCADE,
     status VARCHAR(32) NOT NULL,         -- pending|processing|complete|failed
     s3_url TEXT NULL,
     created_at TIMESTAMPTZ NOT NULL,
     expires_at TIMESTAMPTZ NULL,
     error_message TEXT NULL
   )
   INDEX (user_id, created_at DESC)
   ```
   `down_revision = '0011_reconciliation_log'`
2. **[NEW]** `apps/api/app/models/export_job.py` — SQLAlchemy model.
3. **[NEW]** `apps/api/app/workers/export_tasks.py` — `@shared_task` `build_user_export(job_id, user_id)`:
   - Fetch user + all attempts (speaking, writing, mock_exam) + reports + ai_cost_log entries.
   - Serialize each table to JSON.
   - Zip in-memory (or tempfile).
   - Upload to S3 `exports/{user_id}/{job_id}.zip`.
   - Generate 24h presigned GET URL.
   - Update `export_jobs` row: `status='complete'`, `s3_url=...`, `expires_at=now()+24h`.
4. **[NEW]** `apps/api/app/api/v1/users_export.py` (or extend `users.py`):
   - `POST /users/me/export` → create `export_jobs` row (status=pending), enqueue task, return `{ job_id }` (202).
   - `GET /users/me/export/status/{job_id}` → `{ status, download_url, expires_at }`. 404 if job not owned by caller.
   - Rate-limit: 1 export per user per 24h.
5. **[MODIFY]** `apps/web/app/(main)/account/page.tsx` (or equivalent settings page) — add "Download my data" button that calls POST, then polls GET every 5s, shows download link when ready.

### S2-7 — Audio Transcoding webm → m4a

1. **[NEW]** `apps/api/alembic/versions/0013_audio_m4a_key.py`:
   - `ALTER TABLE speaking_attempts ADD COLUMN audio_m4a_s3_key VARCHAR(512) NULL;`
   - Same column on `mock_exam_task_attempts` if speaking mock attempts also store audio there (verify).
   - `down_revision = '0012_export_jobs'`
2. **[MODIFY]** `apps/api/app/models/attempt.py` — add `audio_m4a_s3_key: Mapped[str | None]` to `SpeakingAttempt` (and mock variant if applicable).
3. **[NEW]** `apps/api/app/workers/transcode_tasks.py`:
   ```python
   @shared_task(queue="transcode", acks_late=True, max_retries=3)
   def transcode_audio_to_m4a(attempt_id: str, s3_key_webm: str) -> str:
       # download webm → tmp file → ffmpeg -i in.webm -c:a aac -b:a 64k out.m4a
       # → upload m4a to s3 (same prefix, .m4a suffix)
       # → UPDATE speaking_attempts SET audio_m4a_s3_key = ... WHERE id = ...
   ```
4. **[MODIFY]** `apps/api/app/workers/speaking_tasks.py`, `apps/api/app/workers/mock_exam_tasks.py` — after scoring task is enqueued, also `transcode_audio_to_m4a.delay(attempt_id, s3_key)`.
5. **[MODIFY]** `apps/api/app/workers/celery_app.py` — register `transcode` queue.
6. **[MODIFY]** `apps/api/Dockerfile` — in worker stage (or single-stage if not split), `RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*`.
7. **[MODIFY]** `apps/api/app/api/v1/reports.py` (and any other endpoint returning audio URL) — prefer `.m4a` presigned URL when `audio_m4a_s3_key` is set, fall back to `.webm`.
8. **[MODIFY]** `docker-compose.yml` — ensure worker service consumes `transcode` queue (`-Q speaking,writing,mock_exam,writing_mock,transcode`) OR add a dedicated transcode worker.

### S2-8 — Read Replica Wiring (code-only)

1. **[MODIFY]** `apps/api/app/core/config.py` — add `DATABASE_READ_URL: str = ""`.
2. **[MODIFY]** `apps/api/app/core/deps.py`:
   - Module-level: build `read_engine` from `DATABASE_READ_URL` if set, else alias to primary engine.
   - New `async def get_read_db() -> AsyncSession` dep using `read_engine`.
   - Read sessions should be read-only — wrap in `BEGIN READ ONLY` or just commit immediately on teardown (no writes expected).
3. **[MODIFY]** Switch read-only routes from `get_db` → `get_read_db`:
   - `apps/api/app/api/v1/history.py` — all routes.
   - `apps/api/app/api/v1/reports.py` — `GET /attempts/{id}/report`.
   - `apps/api/app/api/v1/attempts.py` — `GET /attempts/{id}/status` only (NOT start/submit).
   - `apps/api/app/api/v1/speaking.py`, `writing.py`, `mock_exam.py` — `GET /*/prompts`, `GET /*/tasks` only.
   - **Carefully avoid** any handler that writes — read replica is RO and write attempts will fail at runtime.
4. **[VERIFY]** Without `DATABASE_READ_URL` set, all tests still pass (fallback to primary).

### Step 4 Verification

- `alembic upgrade head` clean; `0013` is the new head.
- `POST /users/me/export` → `GET /users/me/export/status/{id}` → eventually `complete` with downloadable zip containing user data.
- Speaking attempt: confirm `audio_m4a_s3_key` populated after transcode worker runs; iOS Safari can play returned URL.
- With `DATABASE_READ_URL=` empty, app boots and history/reports work. With it set to a copy of primary, same behavior.
- `pytest apps/api/` green end-to-end.

### Step 4 Commit Strategy

`s2-4: GDPR data export`, `s2-7: ios audio transcoding`, `s2-8: read replica wiring`.

---

## Cross-Cutting Watch List (re-check at start of every step)

1. **Migration head:** Always `alembic heads` before adding a new migration. If multiple heads appear, stop and merge (don't create another branch).
2. **Sprint 1 invariants to preserve:**
   - `subscriptions.stripe_payment_intent_id` is the canonical Stripe ref. Don't reintroduce `stripe_subscription_id`.
   - `payment_type` column exists; default `'one_time'`.
   - `X-Request-ID` middleware is wired — any new endpoint should automatically inherit it.
   - `structlog` is the logger; don't import stdlib `logging` directly in new code, use `structlog.get_logger(__name__)`.
   - Rate limiting (`slowapi`) is in place; new expensive endpoints (export, transcode trigger) should get explicit limits.
3. **Stripe model:** One-time payments only. No `Subscription.retrieve` calls anywhere. Reconciliation uses `PaymentIntent.retrieve`.
4. **Test coverage:** Every new endpoint gets at least one happy-path test. Every new Celery task gets at least one mocked test.
5. **No --no-verify commits.** If pre-commit hooks fail, fix the issue.

---

## Open Items / Decisions Deferred

- **Unleash vs env-var-only flags:** Plan supports both. Default to env-var; only spin up Unleash container if user requests it.
- **Grafana dashboard JSON:** Will hand-craft a minimal one (4 panels: API p99, request rate, queue depth, AI cost rate). User can refine later.
- **Read replica infrastructure:** Code-only this sprint. DNS/RDS read replica setup is out of scope.
- **Recharts dep:** Verify presence in `apps/web/package.json` before S2-9 frontend; add if missing.

---

## Session Resumption Protocol

If a future session picks this up cold, it should:

1. Read this file end-to-end first.
2. Run `git log --oneline -30` and identify the last `s2-*` commit to determine progress.
3. Run `alembic heads` to confirm migration state matches expected.
4. Resume at the next un-committed item in the current step.
5. Do **not** reorder steps — each step's verification depends on prior step's invariants.
