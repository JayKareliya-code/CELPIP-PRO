# CELPIP PRO — Backend Documentation Index

> **For LLM use:** Read this file first. It tells you exactly which document
> to open for any given topic. Do NOT scan individual files blindly — use
> this index to navigate directly to the relevant section.

---

## Stack at a Glance

| Layer | Technology |
|-------|-----------|
| API Framework | FastAPI (Python 3.12, async) |
| ORM | SQLAlchemy 2.x (async, `mapped_column` API) |
| Database | PostgreSQL (asyncpg driver) |
| Cache / Broker | Redis |
| Background Jobs | Celery + Celery Beat |
| Auth | Clerk (JWT RS256 / JWKS) |
| AI Scoring | OpenAI — Whisper (STT), GPT-4o-mini (scoring), GPT-4o (vision tasks) |
| Storage | AWS S3 / Cloudflare R2 (presigned URLs) |
| Payments | Stripe (one-time checkout + webhook) |
| Observability | Sentry, Prometheus, OpenTelemetry |

---

## Document Map

### 01 — App Entry Point & Config
**File:** `01_overview/app_entry_point.md`

Read this for:
- How the FastAPI app is created (`create_app()` factory pattern)
- Middleware stack order: `RequestIDMiddleware → RateLimit → CORS`
- Lifespan hooks: PlanEventBus startup, engine disposal
- All env/config variables (`Settings` class) — database, Redis, AI, Stripe, quotas, rate limits
- All API route prefixes and which module handles them
- Sentry / Prometheus / OpenTelemetry setup

---

### 02 — Database Models (ORM)
**File:** `02_models/database_models.md`

Read this for:
- Full column definitions (name, type, nullable, constraints) for every table
- `users` — plan, streak, target_band, TOS fields
- `attempts` + `speaking_attempts` + `writing_attempts` — the parent-child table split
- `speaking_prompts` / `writing_prompts` — exam_slot, is_active, calibration anchor
- `score_reports` + `score_dimensions` — 4-dimension scoring schema (v2)
- `feedback_reports` — strengths, weaknesses, tips, sample_response
- `subscriptions` — Stripe payment tracking
- `stripe_events` — idempotency log for webhooks
- All supporting models: `AiCostLog`, `AdminAuditLog`, `ReconciliationRun`, `ExportJob`, etc.
- All DB indexes and their purpose

---

### 03 — Core: Security & Auth
**File:** `03_core/security_auth.md`

Read this for:
- `get_current_user` dependency — full JWT validation flow (JWKS fetch, RS256 decode, user upsert)
- JWKS in-memory cache (1-hour TTL, asyncio.Lock for concurrency safety)
- `require_admin` — Clerk Backend API role check + DB sync (60-second cache)
- Development bypass token (`test_token_<clerk_user_id>`, only in `APP_ENV=development`)
- `X-User-Date` header — how streak logic runs on user's local date, not server UTC
- `get_db()` / `get_read_db()` / `get_redis_pool()` FastAPI dependencies
- Rate limiting via slowapi — per-route limits, Redis backend, 429 response
- `RequestIDMiddleware` — `X-Request-ID` injection
- Feature flag backends (Unleash vs env-var JSON)

---

### 03 — Core: Quota & Plan Enforcement
**File:** `03_core/quota_system.md`

Read this for:
- Per-plan limits table (Starter / Pro / Ultra) for task practice and mock tests
- `enforce_quota()` — the main gate function, full decision tree with redo logic
- How PostgreSQL advisory locks (`pg_advisory_xact_lock`) prevent race conditions
- `enforce_mock_exam_plan_access()` — plan gate for mock exam uploads
- `PlanEventBus` — single Redis pub/sub subscriber that fans SSE events to browsers
- SSE architecture: how `redis.publish()` → `asyncio.Queue` → browser EventSource works

---

### 04 — API Routes: Speaking, Writing, Users
**File:** `04_api_routes/speaking_writing_routes.md`

Read this for:
- `POST /speaking/attempts` — quota check → DB insert → presigned S3 PUT URL
- `POST /speaking/attempts/{id}/complete` — triggers Celery scoring pipeline
- `GET /speaking/tasks/{n}/prompts` — paginated prompt listing with per-user flags
- `POST /writing/attempts/{id}/submit` — essay validation, sanitisation, scoring enqueue
- `GET /mock-exam/slots/{slot}/prompts` — 8-prompt mock exam fetch
- `GET /users/me` — user profile with plan, streak, TOS status
- `GET /users/me/quota` — full per-task quota consumption response
- `POST /users/me/tos-accept` — TOS acceptance flow
- `GET /history` — paginated attempt history with filters
- `GET /reports/{attempt_id}` — plan-gated report retrieval

---

### 04 — API Routes: Billing & Admin
**File:** `04_api_routes/billing_routes.md`

Read this for:
- `POST /billing/checkout` — Stripe Checkout Session creation (metadata linking)
- `POST /billing/webhook` — signature verification, idempotency, checkout.session.completed + charge.refunded handlers
- Full checkout-completed flow: user plan upgrade → subscription upsert → Redis SSE publish
- Full refund flow: plan downgrade → subscription status update → Redis SSE publish
- `POST /billing/portal` — Stripe Customer Portal session
- `GET /billing/events` — SSE endpoint, one-time token auth, 25s wait timeout
- `POST /billing/sse-token` — short-lived Redis token for EventSource auth
- Admin CRUD for prompts, assets, calibration anchors, tags, audit logs
- `GET /health/live` and `GET /health/ready` probes

---

### 05 — Services: AI Scoring Pipelines
**File:** `05_services/ai_scoring_pipelines.md`

Read this for:
- The 10-step speaking scoring pipeline (mark_processing → STT → scoring → save → complete)
- `PromptContext` dataclass — auto model selection (gpt-4o for image tasks 3/4/8)
- Calibration system — Band-12 anchor injection, `calibration_max_chars` formula
- CELPIP 4-dimension schema: `content_coherence`, `vocabulary`, `listenability`, `task_fulfillment`
- Writing pipeline differences (no STT, no vision)
- Mock exam pipeline — 8-task orchestration + session aggregate report
- AI cost logging to `ai_cost_logs` (every STT + scoring call)
- `ScoringResult` dataclass — full field list
- `OpenAIProvider` — method signatures for STT, speaking score, writing score
- Error handling: rollback on failure, Celery `acks_late` retry guarantee

---

### 05 — Services: Storage, Report & Supporting Services
**File:** `05_services/storage_report_services.md`

Read this for:
- `generate_presigned_put()` — client-side S3 upload flow (900s expiry)
- `generate_presigned_get()` — private asset download URLs
- `download_from_s3()` — used by scoring pipeline to fetch audio
- `extract_s3_key()` — strips stored URL to bare S3 key
- `get_report()` — plan-gated report assembly (StarterReport vs ProReport)
- Score history enrichment — `band_change` delta calculation
- `get_prompts_for_task()` — `has_been_attempted` per-user flag via LEFT JOIN
- `get_mock_exam_prompts()` — slot validation, COMING_SOON trigger
- `create_speaking_attempt()` / `complete_speaking_attempt()` — full attempt lifecycle
- `get_or_create_user()` — upsert + streak update logic
- Admin services: prompt CRUD, asset upload, audit logging, content versioning
- `sanitizer.py` — essay text cleaning before storage

---

### 06 — Workers: Celery Background Tasks
**File:** `06_workers/celery_workers.md`

Read this for:
- Queue topology — 7 isolated queues (speaking, writing, mock_exam, writing_mock, reconciliation, export, transcode)
- Global Celery config: `acks_late`, `reject_on_worker_lost`, `prefetch_multiplier=1`
- Beat schedule: reconciliation (02:00 UTC daily), queue depth polling (30s)
- `speaking_tasks.py` — async-in-Celery pattern, `@lru_cache` engine per worker process
- `transcode_tasks.py` — ffmpeg WebM → M4A, S3 upload, `audio_m4a_s3_key` update
- `reconciliation_tasks.py` — full Stripe PI verification flow, downgrade logic, audit row
- `export_tasks.py` — GDPR ZIP archive generation, presigned download URL
- `metrics_polling.py` — Redis `llen()` → Prometheus gauge for autoscaling

---

### 07 — Schemas: Pydantic API Contracts
**File:** `07_schemas/pydantic_schemas.md`

Read this for:
- `SpeakingAttemptCreate` / `WritingAttemptCreate` / `WritingSubmit` — request bodies
- `AttemptCreatedResponse` — `{ attempt_id, upload_url, expires_in }`
- `AttemptStatusResponse` / `AttemptDetailResponse`
- `StarterReportResponse` vs `ProReportResponse` — full field lists with types
- `PromptOut` / `MockExamPromptOut` — all prompt fields served to frontend
- `UserProfileResponse` / `QuotaResponse` / `ProfileUpdateRequest`
- `HistoryItemOut` / `HistoryPageResponse`
- `ErrorResponse` — standard error envelope with `code`, `upgrade_url`
- `PaginatedResponse[T]` — generic paginated wrapper
- All billing schemas: `CheckoutRequest`, `BillingStatusResponse`, `SSETokenResponse`

---

### 08 — Repositories: Data Access Layer
**File:** `08_repositories/repository_layer.md`

Read this for:
- `AttemptRepository` — all quota counting queries with raw SQL
- `count_distinct_prompts()` / `has_used_prompt()` — practice quota logic
- `count_distinct_mock_slots()` / `has_used_mock_slot()` — mock exam quota logic
- `get_history_page()` — paginated history query with LEFT JOIN on scores
- `get_attempt_with_score()` — ownership-verified attempt + score join
- `get_quota_summary()` — aggregated GROUP BY query for quota response
- `PromptRepo` — practice prompt listing with `has_been_attempted` flag
- `get_previous_best_band()` — progress delta for report service
- `AdminPromptRepository` / `AdminAssetRepository` / `AdminMaterialRepository`
- `UserRepository` — `get_by_clerk_id()` for auth, paid users for reconciliation
- Index usage table + advisory lock concurrency notes

---

## Key Cross-Cutting Concepts

| Concept | Where to look |
|---------|--------------|
| How a user gets authenticated | `03_core/security_auth.md` → `get_current_user` |
| How plan upgrades work end-to-end | `04_api_routes/billing_routes.md` → webhook + SSE |
| How quota is enforced | `03_core/quota_system.md` → `enforce_quota()` |
| How audio gets from browser to AI | `04_api_routes/speaking_writing_routes.md` → presigned PUT flow |
| How AI scoring runs | `05_services/ai_scoring_pipelines.md` → 10-step pipeline |
| How mock exams differ from practice | `04_api_routes/speaking_writing_routes.md` + `06_workers/celery_workers.md` |
| How the report is gated by plan | `05_services/storage_report_services.md` → `get_report()` |
| How retakes avoid double-charging quota | `03_core/quota_system.md` → redo checks |
| Where all config lives | `01_overview/app_entry_point.md` → `Settings` class |
| How nightly Stripe sync works | `06_workers/celery_workers.md` → `reconciliation_tasks` |
