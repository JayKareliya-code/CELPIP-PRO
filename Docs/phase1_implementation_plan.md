# Phase 1 — Foundation & Core Loop
### Detailed Implementation Plan

**Duration:** 3 weeks  
**Goal:** A fully deployable, testable skeleton where a user can sign up, select a task, record a speaking response or write an essay, upload it, and land on a "processing" screen. The AI pipeline is **stubbed** — no real scoring yet. Everything after this phase plugs into infrastructure that already works.

---

## Week-by-Week Breakdown

| Week | Focus | Exit Criteria |
|---|---|---|
| **Week 1** | Repo scaffold, Docker, DB schema, migrations, Clerk auth, health check | `make dev` boots all 5 services; JWT auth works on test route |
| **Week 2** | All backend API routes, Celery stubs, quota enforcement, admin CMS backend | All API endpoints return correct responses; Celery task is enqueued and logs receipt |
| **Week 3** | Full Next.js frontend (speaking + writing UX), admin CMS UI, E2E smoke test | Complete speaking and writing flow works in browser end-to-end |

---

## 1. Repository & Monorepo Scaffold

### Directory Tree (Every File Listed)

```
celpip-platform/
│
├── apps/
│   ├── api/                             ← FastAPI backend
│   │   ├── alembic/
│   │   │   ├── versions/
│   │   │   │   └── 0001_initial_schema.py
│   │   │   └── env.py
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py                  ← FastAPI app factory
│   │   │   ├── core/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── config.py            ← pydantic-settings Settings class
│   │   │   │   ├── security.py          ← Clerk JWT middleware + helpers
│   │   │   │   ├── deps.py              ← FastAPI dependencies (db session, current_user)
│   │   │   │   └── quota.py             ← Attempt quota enforcement
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user.py
│   │   │   │   ├── subscription.py
│   │   │   │   ├── prompt.py
│   │   │   │   ├── attempt.py
│   │   │   │   └── calibration.py
│   │   │   ├── schemas/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user.py
│   │   │   │   ├── prompt.py
│   │   │   │   ├── attempt.py
│   │   │   │   └── common.py
│   │   │   ├── api/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py            ← includes all route modules
│   │   │   │   ├── health.py
│   │   │   │   ├── speaking.py
│   │   │   │   ├── writing.py
│   │   │   │   ├── attempts.py
│   │   │   │   ├── users.py
│   │   │   │   └── admin.py
│   │   │   ├── services/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── attempt_service.py
│   │   │   │   ├── prompt_service.py
│   │   │   │   ├── storage_service.py   ← S3 pre-signed URL generation
│   │   │   │   └── user_service.py
│   │   │   └── workers/
│   │   │       ├── __init__.py
│   │   │       ├── celery_app.py        ← Celery app instance + config
│   │   │       ├── speaking_tasks.py    ← STUB: log + update status
│   │   │       └── writing_tasks.py    ← STUB: log + update status
│   │   ├── tests/
│   │   │   ├── conftest.py
│   │   │   ├── test_health.py
│   │   │   ├── test_speaking.py
│   │   │   ├── test_writing.py
│   │   │   └── test_quota.py
│   │   ├── scripts/
│   │   │   └── seed_prompts.py          ← Seeds 8 speaking + 2 writing prompts
│   │   ├── .env.example
│   │   ├── alembic.ini
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── pyproject.toml               ← ruff, mypy config
│   │
│   └── web/                             ← Next.js 14 frontend
│       ├── app/
│       │   ├── layout.tsx               ← Root layout (ClerkProvider, fonts, nav)
│       │   ├── page.tsx                 ← Landing/redirect page  
│       │   ├── (auth)/
│       │   │   ├── sign-in/[[...sign-in]]/page.tsx
│       │   │   └── sign-up/[[...sign-up]]/page.tsx
│       │   ├── dashboard/
│       │   │   └── page.tsx             ← Placeholder dashboard (Phase 3)
│       │   ├── speaking/
│       │   │   ├── page.tsx             ← Task selection grid
│       │   │   └── [task]/
│       │   │       ├── page.tsx         ← Instruction screen
│       │   │       └── practice/
│       │   │           └── page.tsx     ← Full practice flow (timer + recording)
│       │   ├── writing/
│       │   │   ├── page.tsx             ← Task selection grid
│       │   │   └── [task]/
│       │   │       ├── page.tsx         ← Instruction screen
│       │   │       └── practice/
│       │   │           └── page.tsx     ← Full writing flow (editor + timer)
│       │   ├── attempts/
│       │   │   └── [id]/
│       │   │       ├── status/
│       │   │       │   └── page.tsx     ← Polling / "Processing" screen
│       │   │       └── report/
│       │   │           └── page.tsx     ← Placeholder report (Phase 2)
│       │   ├── history/
│       │   │   └── page.tsx             ← Placeholder (Phase 2)
│       │   ├── billing/
│       │   │   └── page.tsx             ← Placeholder (Phase 3)
│       │   └── admin/
│       │       ├── layout.tsx           ← Admin auth guard
│       │       ├── page.tsx             ← Admin home
│       │       └── prompts/
│       │           └── page.tsx         ← Prompt CRUD table
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.tsx
│       │   │   └── Footer.tsx
│       │   ├── speaking/
│       │   │   ├── TaskGrid.tsx         ← 8-task selection cards
│       │   │   ├── InstructionScreen.tsx
│       │   │   ├── CountdownOverlay.tsx ← 3-2-1 overlay
│       │   │   ├── PrepTimer.tsx        ← Circular countdown for prep time
│       │   │   ├── RecordingInterface.tsx ← Waveform + response timer bar
│       │   │   ├── UploadProgress.tsx
│       │   │   └── ProcessingScreen.tsx
│       │   ├── writing/
│       │   │   ├── TaskGrid.tsx
│       │   │   ├── InstructionScreen.tsx
│       │   │   ├── CountdownOverlay.tsx
│       │   │   ├── WritingEditor.tsx    ← Tiptap editor + word/char counter
│       │   │   ├── WritingTimer.tsx     ← Progress bar + countdown
│       │   │   └── ProcessingScreen.tsx
│       │   ├── admin/
│       │   │   ├── PromptTable.tsx
│       │   │   └── PromptFormModal.tsx
│       │   └── ui/                      ← shadcn/ui generated components
│       ├── lib/
│       │   ├── api.ts                   ← Typed API client (fetch wrapper)
│       │   ├── hooks/
│       │   │   ├── useSpeakingAttempt.ts
│       │   │   ├── useWritingAttempt.ts
│       │   │   └── useAttemptStatus.ts  ← Polling hook
│       │   └── types.ts                 ← Shared TypeScript types
│       ├── public/
│       ├── .env.local.example
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── infra/
│   ├── docker-compose.yml               ← All 5 services for local dev
│   └── docker-compose.override.yml      ← Volume mounts for hot reload
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       └── frontend-ci.yml
│
├── Makefile
└── README.md
```

---

## 2. Local Dev Setup

### `infra/docker-compose.yml`

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: celpip
      POSTGRES_PASSWORD: celpip
      POSTGRES_DB: celpip_dev
    ports: ["5432:5432"]
    volumes: [db_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U celpip"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

  api:
    build: ../apps/api
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql+asyncpg://celpip:celpip@db:5432/celpip_dev
      REDIS_URL: redis://redis:6379/0
    env_file: ../apps/api/.env
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
    volumes: [../apps/api:/app]

  worker:
    build: ../apps/api
    command: celery -A app.workers.celery_app worker --loglevel=info -Q speaking,writing
    environment:
      DATABASE_URL: postgresql+asyncpg://celpip:celpip@db:5432/celpip_dev
      REDIS_URL: redis://redis:6379/0
    env_file: ../apps/api/.env
    depends_on: [api]
    volumes: [../apps/api:/app]

  flower:
    build: ../apps/api
    command: celery -A app.workers.celery_app flower --port=5555
    ports: ["5555:5555"]
    depends_on: [redis]

volumes:
  db_data:
```

### `Makefile`

```makefile
.PHONY: dev migrate test lint seed

dev:
	docker compose -f infra/docker-compose.yml up --build

migrate:
	docker compose -f infra/docker-compose.yml exec api \
	  alembic upgrade head

seed:
	docker compose -f infra/docker-compose.yml exec api \
	  python scripts/seed_prompts.py

test:
	docker compose -f infra/docker-compose.yml exec api \
	  python -m pytest tests/ -v --cov=app --cov-report=term-missing

lint:
	cd apps/api && ruff check . && mypy app/
	cd apps/web && npx eslint . && npx tsc --noEmit
```

---

## 3. Backend — Configuration

### `apps/api/app/core/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_ENV: str = "development"
    APP_NAME: str = "CELPIP Platform API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str  # postgresql+asyncpg://...

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # Clerk Auth
    CLERK_SECRET_KEY: str
    CLERK_PUBLISHABLE_KEY: str
    CLERK_JWKS_URL: str = "https://api.clerk.dev/v1/jwks"

    # S3
    S3_BUCKET_NAME: str
    S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    S3_PRESIGNED_EXPIRY_SECONDS: int = 900   # 15 min for upload

    # Quotas
    FREE_PLAN_ATTEMPT_LIMIT: int = 2         # Lifetime for free users

    # AI (stubs for Phase 1 — wired in Phase 2)
    AI_SCORING_PROVIDER: str = "openai"
    AI_SCORING_MODEL: str = "gpt-4o-mini"
    AI_STT_MODEL: str = "whisper-1"
    AI_FEEDBACK_MODEL: str = "gpt-4o-mini"
    OPENAI_API_KEY: str = ""

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

---

## 4. Database Schema (Complete DDL)

All migrations created via Alembic. The full schema for Phase 1:

```sql
-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id   TEXT UNIQUE NOT NULL,        -- Clerk's user ID
    email           TEXT UNIQUE NOT NULL,
    full_name       TEXT,
    plan            TEXT NOT NULL DEFAULT 'free', -- 'free' | 'premium' | 'premium_plus'
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    streak_days     INT NOT NULL DEFAULT 0,
    last_active_date DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);

-- ─────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────
CREATE TABLE subscriptions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id    TEXT,
    plan                  TEXT NOT NULL,          -- 'premium' | 'premium_plus'
    status                TEXT NOT NULL,          -- 'active' | 'canceled' | 'past_due'
    current_period_start  TIMESTAMPTZ,
    current_period_end    TIMESTAMPTZ,
    canceled_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- ─────────────────────────────────────────
-- TARGET SCORES
-- ─────────────────────────────────────────
CREATE TABLE target_scores (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill         TEXT NOT NULL,                  -- 'speaking' | 'writing' | 'overall'
    target_band   NUMERIC(3,1) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, skill)
);

-- ─────────────────────────────────────────
-- SPEAKING PROMPTS
-- ─────────────────────────────────────────
CREATE TABLE speaking_prompts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number         INT NOT NULL CHECK (task_number BETWEEN 1 AND 8),
    title               TEXT NOT NULL,
    prompt_text         TEXT NOT NULL,
    context_image_url   TEXT,                     -- optional image for task context
    prep_time_seconds   INT NOT NULL,             -- e.g. 30 or 60
    response_time_seconds INT NOT NULL,           -- e.g. 60 or 90
    difficulty          TEXT NOT NULL DEFAULT 'medium', -- 'easy'|'medium'|'hard'
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    sample_response_text TEXT,                   -- high-band sample (for calibration too)
    vocabulary_tips     TEXT[],                  -- key vocab/connectors for this task
    template_hint       TEXT,                    -- structural template suggestion
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_speaking_prompts_task ON speaking_prompts(task_number);

-- ─────────────────────────────────────────
-- WRITING PROMPTS
-- ─────────────────────────────────────────
CREATE TABLE writing_prompts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number           INT NOT NULL CHECK (task_number IN (1, 2)),
    title                 TEXT NOT NULL,
    prompt_text           TEXT NOT NULL,
    task_type             TEXT NOT NULL,          -- 'email' | 'survey' | 'opinion' | 'argument'
    min_words             INT NOT NULL,
    max_words             INT,
    time_limit_seconds    INT NOT NULL,
    difficulty            TEXT NOT NULL DEFAULT 'medium',
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    sample_response_text  TEXT,
    idea_hints            TEXT[],                 -- idea generation assistance
    intro_template        TEXT,
    conclusion_template   TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_writing_prompts_task ON writing_prompts(task_number);

-- ─────────────────────────────────────────
-- ATTEMPTS (parent table)
-- ─────────────────────────────────────────
CREATE TABLE attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill           TEXT NOT NULL,                -- 'speaking' | 'writing'
    prompt_id       UUID NOT NULL,                -- FK enforced at app layer (polymorphic)
    status          TEXT NOT NULL DEFAULT 'pending',
                    -- 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled'
    celery_task_id  TEXT,
    error_message   TEXT,                         -- set on failure
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempts_user_id ON attempts(user_id);
CREATE INDEX idx_attempts_status ON attempts(status);
CREATE INDEX idx_attempts_user_skill ON attempts(user_id, skill);

-- ─────────────────────────────────────────
-- SPEAKING ATTEMPTS
-- ─────────────────────────────────────────
CREATE TABLE speaking_attempts (
    attempt_id        UUID PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
    audio_s3_key      TEXT,                       -- set after upload
    audio_duration_ms INT,
    upload_completed  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- WRITING ATTEMPTS
-- ─────────────────────────────────────────
CREATE TABLE writing_attempts (
    attempt_id    UUID PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
    essay_text    TEXT,                           -- set on submit
    word_count    INT,
    char_count    INT,
    auto_submitted BOOLEAN NOT NULL DEFAULT FALSE, -- true if timer expired
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CALIBRATION SAMPLES (Phase 1 — admin seeds Band 12)
-- ─────────────────────────────────────────
CREATE TABLE calibration_samples (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill         TEXT NOT NULL,                  -- 'speaking' | 'writing'
    task_number   INT,                            -- NULL = all tasks
    band_level    NUMERIC(3,1) NOT NULL,          -- 12.0, 10.0, 7.0, 5.0
    sample_text   TEXT NOT NULL,
    source        TEXT NOT NULL DEFAULT 'official',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calibration_skill_task ON calibration_samples(skill, task_number);
```

> [!IMPORTANT]
> Phase 2 adds: `transcripts`, `score_reports`, `score_dimensions`, `feedback_reports`, `progress_snapshots`. They are NOT created in Phase 1 migrations.

---

## 5. Backend — Security Middleware

### `apps/api/app/core/security.py`

```python
"""
Clerk JWT validation for FastAPI.
Every protected route calls get_current_user() which:
  1. Extracts Bearer token from Authorization header
  2. Fetches Clerk JWKS (cached 1 hour)
  3. Validates signature + expiry + issuer
  4. Returns internal User object from DB
"""
import logging
from functools import lru_cache
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_db
from app.models.user import User
from app.services.user_service import get_or_create_user

logger = logging.getLogger(__name__)
security = HTTPBearer()
settings = get_settings()

@lru_cache(maxsize=1)
def _get_cached_jwks() -> dict:
    """Fetch JWKS from Clerk (cached in-process — refresh restarts cache)."""
    response = httpx.get(settings.CLERK_JWKS_URL, timeout=10)
    response.raise_for_status()
    return response.json()

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    FastAPI dependency. Returns the authenticated User from DB.
    Raises HTTP 401 on any auth failure.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        jwks = _get_cached_jwks()
        # Decode without verification first to get the kid
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        # Find matching key
        public_key = next(
            (k for k in jwks["keys"] if k["kid"] == kid), None
        )
        if not public_key:
            raise credentials_exception
        key = jwk.construct(public_key)
        payload = jwt.decode(
            token, key, algorithms=["RS256"],
            options={"verify_aud": False}
        )
        clerk_user_id: str = payload.get("sub")
        email: str = payload.get("email", "")
        full_name: str = payload.get("name", "")
        if not clerk_user_id:
            raise credentials_exception
    except JWTError as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise credentials_exception

    # Upsert user in DB (first login creates the record)
    user = await get_or_create_user(db, clerk_user_id, email, full_name)
    return user

async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Dependency that additionally requires is_admin = True."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user
```

---

## 6. Backend — Quota Enforcement

### `apps/api/app/core/quota.py`

```python
"""
Atomic quota check before every AI-graded attempt creation.
Free users: 2 lifetime AI-graded attempts (speaking + writing combined).
Premium/Premium+: unlimited.
"""
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.user import User
from fastapi import HTTPException, status


PLAN_LIMITS: dict[str, int | None] = {
    "free": 2,        # lifetime — enforced strictly
    "premium": None,  # unlimited
    "premium_plus": None,
}


async def check_and_reserve_attempt(user: User, db: AsyncSession) -> None:
    """
    Check if user can create a new attempt.
    Uses SELECT FOR UPDATE to prevent race-condition double-spending.
    Raises HTTP 402 if limit exceeded.
    """
    limit = PLAN_LIMITS.get(user.plan)
    if limit is None:
        return  # unlimited plan — no check needed

    # Atomic count with row lock
    result = await db.execute(
        select(func.count(Attempt.id))
        .where(Attempt.user_id == user.id)
        .where(Attempt.status != "cancelled")
        .with_for_update()
    )
    used = result.scalar_one()

    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "QUOTA_EXCEEDED",
                "message": f"Free plan allows {limit} AI-graded attempts. "
                           "Upgrade to Premium for unlimited practice.",
                "used": used,
                "limit": limit,
            },
        )
```

---

## 7. Backend — All API Routes

### Route Map

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | DB + Redis liveness check |
| `GET` | `/api/v1/users/me` | User | Get current user profile |
| `PATCH` | `/api/v1/users/me/target-score` | User | Set target band score |
| `GET` | `/api/v1/speaking/tasks` | User | List all 8 tasks with metadata |
| `GET` | `/api/v1/speaking/tasks/{task_number}` | User | Single task detail + tips |
| `POST` | `/api/v1/speaking/attempts/start` | User | Create attempt, return attempt_id |
| `POST` | `/api/v1/speaking/attempts/{id}/upload-url` | User | Return S3 pre-signed upload URL |
| `POST` | `/api/v1/speaking/attempts/{id}/confirm-upload` | User | Mark upload done, enqueue worker |
| `GET` | `/api/v1/writing/tasks` | User | List Task 1 + Task 2 |
| `GET` | `/api/v1/writing/tasks/{task_number}` | User | Single task detail + hints |
| `POST` | `/api/v1/writing/attempts/start` | User | Create attempt, return attempt_id |
| `POST` | `/api/v1/writing/attempts/{id}/submit` | User | Save essay, enqueue worker |
| `GET` | `/api/v1/attempts/{id}/status` | User | Poll for attempt status |
| `GET` | `/api/v1/attempts/{id}/report` | User | Get full report (Phase 2 populates) |
| `GET` | `/api/v1/history` | User | Paginated attempt list |
| `GET` | `/api/v1/admin/prompts` | Admin | List all prompts |
| `POST` | `/api/v1/admin/prompts/speaking` | Admin | Create speaking prompt |
| `PUT` | `/api/v1/admin/prompts/speaking/{id}` | Admin | Update speaking prompt |
| `DELETE` | `/api/v1/admin/prompts/speaking/{id}` | Admin | Soft-delete (is_active=false) |
| `POST` | `/api/v1/admin/prompts/writing` | Admin | Create writing prompt |
| `PUT` | `/api/v1/admin/prompts/writing/{id}` | Admin | Update writing prompt |
| `POST` | `/api/v1/admin/calibration` | Admin | Add calibration sample |
| `GET` | `/api/v1/admin/calibration` | Admin | List all calibration samples |

### Key Pydantic Schemas

```python
# schemas/attempt.py

class StartSpeakingAttemptRequest(BaseModel):
    prompt_id: UUID

class StartSpeakingAttemptResponse(BaseModel):
    attempt_id: UUID
    status: str
    created_at: datetime

class UploadUrlResponse(BaseModel):
    upload_url: str          # S3 pre-signed PUT URL
    s3_key: str              # stored for confirm step
    expires_in_seconds: int

class ConfirmUploadRequest(BaseModel):
    s3_key: str
    audio_duration_ms: int

class StartWritingAttemptRequest(BaseModel):
    prompt_id: UUID

class SubmitWritingRequest(BaseModel):
    essay_text: str
    auto_submitted: bool = False   # true if timer triggered submission

class AttemptStatusResponse(BaseModel):
    attempt_id: UUID
    status: str              # pending|processing|complete|failed
    skill: str
    celery_task_id: str | None
    error_message: str | None
    report_available: bool   # True when status == 'complete'
    created_at: datetime
    updated_at: datetime
```

---

## 8. Backend — Celery Worker Stubs

### `apps/api/app/workers/celery_app.py`

```python
from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "celpip_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_routes={
        "app.workers.speaking_tasks.*": {"queue": "speaking"},
        "app.workers.writing_tasks.*": {"queue": "writing"},
    },
    task_acks_late=True,           # Only ack after task completes
    worker_prefetch_multiplier=1,  # Prevent worker starvation
)
```

### `apps/api/app/workers/speaking_tasks.py` (Phase 1 STUB)

```python
import logging
from uuid import UUID
from celery import shared_task
# Real pipeline wired in Phase 2

logger = logging.getLogger(__name__)

@shared_task(
    name="speaking.process_attempt",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
)
def process_speaking_attempt(self, attempt_id: str) -> dict:
    """
    PHASE 1 STUB: Simulates receiving a job.
    Phase 2 replaces the body with: STT → Rubric LLM → DB write.
    """
    logger.info("[STUB] Speaking worker received attempt_id=%s", attempt_id)
    # TODO Phase 2: update status → 'processing', call STT, call LLM, write results
    return {"attempt_id": attempt_id, "status": "stub_received"}
```

> [!TIP]
> The stub pattern means Phase 2 is a **drop-in replacement** of the function body only. No routing, no infra, no schema changes needed.

---

## 9. Frontend — Speaking Practice UX Flow

This is the most critical UX piece in Phase 1. The flow must feel exactly like a real exam.

### State Machine (per session)

```
TASK_SELECTION
    → (user clicks task card)
INSTRUCTION_SCREEN            [shows prompt text, prep/response times, tips]
    → (user clicks "Start Practice")
COUNTDOWN_321                 [fullscreen overlay: 3 → 2 → 1 → GO, 1s each]
    → (countdown ends)
PREP_TIMER                    [circular countdown ring, read the prompt]
    → (prep timer hits 0 — auto-transition, NO user action)
RECORDING                     [MediaRecorder starts automatically]
    [progress bar depletes over response_time_seconds]
    → (bar hits 0 — auto-stop recording)
UPLOADING                     [show progress bar, upload to S3 pre-signed URL]
    → (upload complete)
PROCESSING                    [polling GET /attempts/{id}/status every 3s]
    → (Phase 2: status == 'complete' → redirect to /attempts/{id}/report)
    → (Phase 1: stays on processing screen, shows "Report coming soon")
```

### `components/speaking/RecordingInterface.tsx`

```tsx
"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  responseTimeSecs: number;
  onRecordingComplete: (blob: Blob) => void;
}

export function RecordingInterface({ responseTimeSecs, onRecordingComplete }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(responseTimeSecs);
  const [isRecording, setIsRecording] = useState(false);
  const [waveformActive, setWaveformActive] = useState(false);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
  }, []);

  useEffect(() => {
    // Auto-start recording on mount
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop()); // release mic
        onRecordingComplete(blob);
      };

      recorder.start(250); // collect every 250ms chunks
      setIsRecording(true);
      setWaveformActive(true);
    })();

    // Countdown timer
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          stopRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onRecordingComplete, stopRecording]);

  const progress = ((responseTimeSecs - secondsLeft) / responseTimeSecs) * 100;

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      {/* Waveform animation */}
      <div className="flex gap-1 h-16 items-end">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 bg-red-500 rounded-full transition-all duration-75 ${
              waveformActive ? "animate-pulse" : "h-1"
            }`}
            style={{ height: waveformActive ? `${Math.random() * 100}%` : "4px" }}
          />
        ))}
      </div>

      {/* Time remaining */}
      <p className="text-4xl font-mono font-bold text-white">
        {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
      </p>

      {/* Response progress bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-sm text-gray-400">
        {isRecording ? "🔴 Recording — speak clearly" : "Stopping..."}
      </p>
    </div>
  );
}
```

### `lib/hooks/useAttemptStatus.ts` — Polling Hook

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type AttemptStatus = "pending" | "processing" | "complete" | "failed";

interface StatusResponse {
  attempt_id: string;
  status: AttemptStatus;
  report_available: boolean;
}

export function useAttemptStatus(attemptId: string | null) {
  return useQuery<StatusResponse>({
    queryKey: ["attempt-status", attemptId],
    queryFn: () => apiClient.get(`/attempts/${attemptId}/status`),
    enabled: !!attemptId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling when terminal state reached
      if (status === "complete" || status === "failed") return false;
      return 3000; // poll every 3 seconds
    },
    staleTime: 0,
  });
}
```

---

## 10. Frontend — Writing Practice UX Flow

### State Machine

```
TASK_SELECTION
    → (user clicks task card)
INSTRUCTION_SCREEN            [shows prompt, word limit, time limit, idea hints]
    → (user clicks "Start Writing")
COUNTDOWN_321                 [same 3-2-1 overlay as speaking]
    → (countdown ends)
WRITING_SESSION
    [Tiptap rich text editor — full screen focus mode]
    [Live word counter (highlight red if below min_words)]
    [Timer progress bar across top of screen]
    [5-minute warning: yellow indicator]
    [1-minute warning: red pulsing indicator]
    → (timer hits 0 — auto-submit, auto_submitted=true)
    → (user clicks "Submit" — auto_submitted=false)
SUBMITTING                    [saves essay to backend]
    → (submit complete)
PROCESSING                    [same polling screen as speaking]
```

### `components/writing/WritingEditor.tsx`

```tsx
"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState, useCallback } from "react";

interface Props {
  timeLimitSecs: number;
  minWords: number;
  onSubmit: (text: string, autoSubmitted: boolean) => void;
}

export function WritingEditor({ timeLimitSecs, minWords, onSubmit }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSecs);
  const [wordCount, setWordCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
    },
  });

  const handleSubmit = useCallback(
    (autoSubmitted: boolean) => {
      if (submitted || !editor) return;
      setSubmitted(true);
      onSubmit(editor.getText(), autoSubmitted);
    },
    [editor, onSubmit, submitted]
  );

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          handleSubmit(true); // auto-submit
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [handleSubmit]);

  const progress = ((timeLimitSecs - secondsLeft) / timeLimitSecs) * 100;
  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const isWarning = secondsLeft <= 300; // 5 min
  const isCritical = secondsLeft <= 60; // 1 min
  const wordCountOk = wordCount >= minWords;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Timer bar */}
      <div className="h-1.5 w-full bg-gray-800">
        <div
          className={`h-full transition-all duration-1000 ${
            isCritical ? "bg-red-500 animate-pulse" : isWarning ? "bg-yellow-400" : "bg-emerald-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header row */}
      <div className="flex justify-between items-center px-6 py-3 border-b border-gray-800">
        <span className={`font-mono text-lg font-bold ${isCritical ? "text-red-400" : "text-white"}`}>
          {mins}:{secs}
        </span>
        <span className={`text-sm ${wordCountOk ? "text-emerald-400" : "text-red-400"}`}>
          {wordCount} words {!wordCountOk && `(min ${minWords})`}
        </span>
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitted}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          Submit
        </button>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="flex-1 overflow-auto px-8 py-6 text-lg leading-relaxed prose prose-invert max-w-none focus:outline-none"
      />
    </div>
  );
}
```

---

## 11. Admin CMS — Prompt Management

### What Phase 1 Admin Can Do

- View all speaking prompts (table with task number, title, active status)
- Create / Edit / Soft-delete speaking prompts (form modal)
- View all writing prompts
- Create / Edit / Soft-delete writing prompts
- Add calibration samples (paste Band 12 text, set task + band level)
- View active calibration samples

### Admin Route Guard

```tsx
// app/admin/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth();
  // Check Clerk metadata for admin role
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
```

---

## 12. Seed Data

### `apps/api/scripts/seed_prompts.py`

Seeds the following on first `make seed`:

| Task | Official Task Name | Prep Time | Response Time | Notes |
|---|---|---|---|---|
| Practice | Practice Task | 30s | 60s | Unscored warm-up |
| Task 1 | Giving Advice | 30s | 90s | Personal situation advice |
| Task 2 | Talking about a Personal Experience | 30s | 60s | Past experience narrative |
| Task 3 | Describing a Scene | 30s | 60s | Describe image/scene |
| Task 4 | Making Predictions | 30s | 60s | Image-based prediction |
| Task 5 | Comparing and Persuading — Part 1 | 60s | none | Prep both parts together |
| Task 5 | Comparing and Persuading — Part 2 | — | 60s | Delivered after Part 1 prep |
| Task 6 | Dealing with a Difficult Situation | 60s | 60s | Problem-solution format |
| Task 7 | Expressing Opinions | 30s | 90s | Opinion + justification |
| Task 8 | Describing an Unusual Situation | 30s | 60s | Narrative description |
| Writing T1 | Writing an Email | — | 27 min | Email format response |
| Writing T2 | Responding to Survey Questions | — | 26 min | Short answer survey format |

---

## 13. CI/CD Pipeline

### `.github/workflows/backend-ci.yml`

```yaml
name: Backend CI
on:
  pull_request:
    paths: ["apps/api/**"]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_USER: celpip, POSTGRES_PASSWORD: celpip, POSTGRES_DB: test }
        options: --health-cmd pg_isready --health-interval 5s --health-retries 5
      redis:
        image: redis:7-alpine
        options: --health-cmd "redis-cli ping" --health-interval 5s

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r apps/api/requirements.txt
      - run: cd apps/api && ruff check .
      - run: cd apps/api && mypy app/ --ignore-missing-imports
      - run: cd apps/api && pytest tests/ -v --cov=app
        env:
          DATABASE_URL: postgresql+asyncpg://celpip:celpip@localhost:5432/test
          REDIS_URL: redis://localhost:6379/0
          CLERK_SECRET_KEY: test_key
          S3_BUCKET_NAME: test-bucket
          AWS_ACCESS_KEY_ID: test
          AWS_SECRET_ACCESS_KEY: test
```

### `.github/workflows/frontend-ci.yml`

```yaml
name: Frontend CI
on:
  pull_request:
    paths: ["apps/web/**"]

jobs:
  lint-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm", cache-dependency-path: apps/web/package-lock.json }
      - run: cd apps/web && npm ci
      - run: cd apps/web && npx eslint .
      - run: cd apps/web && npx tsc --noEmit
      - run: cd apps/web && npm run build
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_placeholder
          CLERK_SECRET_KEY: sk_test_placeholder
          NEXT_PUBLIC_API_URL: http://localhost:8000
```

---

## 14. Environment Variables Reference

### `apps/api/.env.example`

```dotenv
# App
APP_ENV=development
DEBUG=true

# Database
DATABASE_URL=postgresql+asyncpg://celpip:celpip@localhost:5432/celpip_dev

# Redis
REDIS_URL=redis://localhost:6379/0

# Clerk (get from clerk.com dashboard)
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# AWS S3 (or use LocalStack for dev)
S3_BUCKET_NAME=celpip-audio-dev
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# AI Keys (stubbed in Phase 1, required in Phase 2)
OPENAI_API_KEY=
```

### `apps/web/.env.local.example`

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 15. Phase 1 Deliverables — Acceptance Checklist

```
Infrastructure
  [ ] make dev boots all 5 services (api, worker, flower, db, redis) with no errors
  [ ] make migrate runs all migrations cleanly
  [ ] make seed populates 8 speaking + 2 writing prompts
  [ ] make test passes with > 80% backend coverage

Authentication
  [ ] Sign up with email/Google creates a user row in DB
  [ ] JWT token is validated on every protected API route
  [ ] Unauthenticated request returns HTTP 401
  [ ] Admin route returns HTTP 403 for non-admin users

Speaking Flow
  [ ] Task selection page shows all 8 tasks with prep/response times
  [ ] Instruction screen renders prompt text + vocabulary tips
  [ ] Countdown 3-2-1 overlay plays and transitions automatically
  [ ] Prep timer counts down and auto-transitions to recording
  [ ] MediaRecorder starts automatically at recording phase
  [ ] Response timer progress bar depletes; auto-stops recording at 0
  [ ] Audio uploads to S3 via pre-signed URL (confirmed with real bucket or LocalStack)
  [ ] Celery speaking task is enqueued and appears in Flower

Writing Flow
  [ ] Task selection shows 2 tasks with task type + word limits
  [ ] Instruction screen shows prompt + idea hints
  [ ] Countdown plays and transitions automatically
  [ ] Editor loads with word counter showing live count
  [ ] Timer bar depletes; auto-submits at 0 with auto_submitted=true
  [ ] Manual submit saves essay text correctly
  [ ] Celery writing task is enqueued

Quota Enforcement
  [ ] Free user's 3rd attempt creation returns HTTP 402
  [ ] HTTP 402 response includes QUOTA_EXCEEDED code + upgrade message
  [ ] Premium user (plan manually set in DB) is not blocked

Admin CMS
  [ ] Admin can list, create, edit, and soft-delete speaking prompts
  [ ] Admin can add a calibration sample (Band 12 text, skill, task)
  [ ] Non-admin user is redirected away from /admin

CI
  [ ] Backend CI: ruff + mypy + pytest all pass on PR
  [ ] Frontend CI: eslint + tsc + build all pass on PR
```

---

## 16. Phase 1 `requirements.txt`

```
# Core
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
pydantic-settings>=2.2.0

# Database
sqlalchemy[asyncio]>=2.0.30
asyncpg>=0.29.0
alembic>=1.13.0

# Auth
python-jose[cryptography]>=3.3.0
httpx>=0.27.0          # for JWKS fetch

# Workers
celery[redis]>=5.4.0
redis>=5.0.0

# AWS
boto3>=1.34.0

# Testing
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=5.0.0
pytest-mock>=3.14.0
httpx>=0.27.0          # for TestClient

# Linting
ruff>=0.4.0
mypy>=1.10.0
```

## 17. Phase 1 `package.json` (web — key deps)

```json
{
  "dependencies": {
    "next": "14.2.x",
    "@clerk/nextjs": "^5.0.0",
    "@tanstack/react-query": "^5.40.0",
    "@tiptap/react": "^2.4.0",
    "@tiptap/starter-kit": "^2.4.0",
    "tailwindcss": "^3.4.0",
    "clsx": "^2.1.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.x"
  }
}
```

---

> [!NOTE]
> **Phase 2 starts immediately after Phase 1 acceptance checklist is 100% green.** The first commit of Phase 2 replaces the Celery stub bodies with real STT → rubric LLM calls. No schema changes, no routing changes, no infra changes needed.
