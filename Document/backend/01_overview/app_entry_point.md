# CELPIP PRO — Backend Overview & Application Entry Point

**Author:** Senior Software Engineer  
**Stack:** Python 3.12, FastAPI, SQLAlchemy (async), PostgreSQL, Redis, Celery  
**File:** `apps/api/app/main.py`

---

## 1. Architecture Summary

The backend is a **FastAPI** application served by **Uvicorn** (ASGI). It follows a
layered architecture:

```
HTTP Request
    ↓
Middleware Stack (RequestID → RateLimit → CORS)
    ↓
API Router  (/api/v1/*)
    ↓
Route Handler  (auth dep → quota check → business logic)
    ↓
Service Layer  (attempt_service, report_service, …)
    ↓
Repository Layer  (AttemptRepo, PromptRepo, …)
    ↓
PostgreSQL (async via asyncpg)
    ↓
Celery Workers (Redis broker — async AI scoring pipelines)
```

---

## 2. `main.py` — Application Factory

### Purpose
Creates and configures the FastAPI application. Registers all middleware,
routers, and lifespan hooks. Follows the factory pattern (`create_app()`)
so the app object can be imported without side-effects during testing.

### Lifespan (startup / shutdown)

| Phase    | Action |
|----------|--------|
| Startup  | Initialises OpenTelemetry tracing via `setup_otel()` |
| Startup  | Starts the `PlanEventBus` — a single Redis pub/sub subscriber that fans out SSE plan-update events to all connected browser clients |
| Shutdown | Stops the `PlanEventBus` and disposes the async SQLAlchemy engine |

### Middleware Stack (applied in order)

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `RequestIDMiddleware` | Stamps every request/response with a unique `X-Request-ID` header for log correlation |
| 2 | `SlowAPIMiddleware` | Per-route rate limiting backed by Redis (via slowapi) |
| 3 | `CORSMiddleware` | Allows `Authorization`, `Stripe-Signature`, `X-User-Date` headers; exposes `X-Request-ID` to clients |

### CORS Configuration
- **Dev:** `localhost:3000` + `127.0.0.1:3000` always allowed.
- **LAN dev:** `HOST_IP` env var automatically appended (e.g. `10.150.0.143:3000`).
- **Production guard:** Raises `ValueError` at startup if `localhost` or `http://` origins are detected, preventing accidental dev config in prod.

### Global Exception Handler
Catches all unhandled 500 errors and re-attaches CORS headers to the response.
This prevents the browser from misreading a 500 as a CORS error.

### Observability (Optional)
- **Sentry:** Activated when `SENTRY_DSN` env var is set. Instruments FastAPI,
  SQLAlchemy, Celery, and Redis. PII sending is disabled by default. 10% trace
  sampling in production, 100% in dev.
- **Prometheus:** `/metrics` endpoint exposed via `prometheus-fastapi-instrumentator`.
  Optionally protected by `METRICS_AUTH_TOKEN`.
- **OpenTelemetry:** OTLP gRPC tracing when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
  (e.g. Jaeger in docker-compose).

---

## 3. `core/config.py` — Application Settings

**Class:** `Settings(BaseSettings)`  
**Pattern:** Pydantic v2 settings with `.env` file support + `@lru_cache` singleton.

### Key Configuration Groups

| Group | Variables | Description |
|-------|-----------|-------------|
| App | `APP_ENV`, `APP_NAME`, `DEBUG` | Runtime environment (`development` / `staging` / `production`) |
| Database | `DATABASE_URL`, `DATABASE_READ_URL` | Primary async PostgreSQL URL; optional read-replica |
| Redis | `REDIS_URL` | Broker for Celery and pub/sub |
| Auth | `CLERK_SECRET_KEY`, `CLERK_JWKS_URL` | Clerk JWT verification |
| Storage | `S3_BUCKET_NAME`, `S3_ENDPOINT_URL`, `AWS_*` | Audio/image storage (AWS S3 or Cloudflare R2) |
| AI | `AI_SCORING_MODEL`, `AI_STT_MODEL`, `OPENAI_API_KEY` | GPT-4o-mini scoring, Whisper STT |
| Billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` | Stripe integration |
| Quotas | `PRO_SPEAKING_PER_TASK`, `STARTER_SPEAKING_MOCK_TESTS`, … | Per-plan attempt limits |
| Rate Limits | `RATE_LIMIT_ATTEMPTS_PER_MIN`, `RATE_LIMIT_CHECKOUT_PER_MIN` | slowapi rate limit strings |
| Feature Flags | `UNLEASH_URL`, `FEATURE_FLAGS_JSON` | Unleash or env-var JSON flags |
| Upload Limits | `AUDIO_MAX_BYTES` (25 MB), `ESSAY_MAX_CHARS` (8000) | Input size guards |

### Auto-computed Fields
The `_apply_host_ip` validator automatically derives `CORS_ORIGINS` and
`FRONTEND_URL` from a single `HOST_IP` value. Explicitly set either variable
in `.env` to override (used in staging/production).

---

## 4. `api/router.py` — API Route Registration

All routes are mounted under the `/api/v1` prefix and grouped by domain:

| Prefix | Module | Description |
|--------|--------|-------------|
| `/health` | `health.py` | Liveness and readiness probes |
| `/users` | `users.py` | Auth, profile, quota, TOS |
| `/speaking` | `speaking.py` | Speaking prompt serving and attempt submission |
| `/writing` | `writing.py` | Writing prompt serving and essay submission |
| `/mock-exam` | `mock_exam.py` | Full 8-task mock exam orchestration |
| `/attempts` | `attempts.py` | Attempt status polling |
| `/reports` | `reports.py` | Score report retrieval |
| `/history` | `history.py` | Attempt history with filters |
| `/billing/*` | `billing/router.py` | Checkout, webhook, portal, SSE plan events |
| `/admin/*` | `admin.py`, `admin_prompts.py`, … | Admin-only prompt/asset/tag management |
| `/feature-flags` | `feature_flags.py` | Runtime flag exposure to frontend |
