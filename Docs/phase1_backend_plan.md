# Phase 1 — Backend Implementation Plan
### FastAPI · SQLAlchemy 2.0 (async) · Celery · Redis · PostgreSQL · S3

**Context:** Phase 1 UI is complete. Every hook (`useSpeakingAttempt`, `useWritingAttempt`,
`useAttemptStatus`, `usePrompts`, `useQuota`, `useCurrentUser`) currently runs on mock data.
This plan replaces every `mock-*` call with a real API contract. The goal is a fully functional
backend that the frontend can be wired to with a single env-var change
(`NEXT_PUBLIC_USE_MOCK=false`).

**Duration:** ~1 week of focused backend work (parallel to any remaining UI polish).

---

## 0. Senior Engineering Observations on the UI

Before touching code, a few things observed from the UI codebase that **must be honoured**
by the backend contract:

| Observation | Backend implication |
|---|---|
| `UserPlan` is typed as `"starter" \| "pro" \| "ultra"` (not `free/premium`) | DB `plan` column must use `starter/pro/ultra` — **not** the general plan doc's `free/premium` naming |
| Starter quota: 1 full mock test (not 2 free attempts) | Quota model is per-task-type, not a single lifetime counter |
| Pro: 5 attempts per task × 10 tasks | Quota checked per `(user_id, skill, task_number)` count |
| Ultra: 15 attempts per task | Same quota shape, higher ceiling |
| `api.ts` sends **no auth header yet** — it's a plain fetch wrapper | Backend must be designed to accept Clerk `Authorization: Bearer <JWT>` header; the hook layer will add it after wiring |
| `useAttemptStatus` polls `GET /attempts/{id}/status` every 3 s | Status endpoint must be cheap: a single indexed DB read, no joins |
| `usePrompts` fetches `/speaking/tasks` and `/writing/tasks` | Response shape must match `SpeakingTask` and `WritingTask` TypeScript interfaces exactly |
| `countWords()` is client-side | Server must also count words on submit (source of truth for billing/quota) |
| Task 5 has `has_parts: true, part_count: 2` | `speaking_prompts` table needs a `has_parts` boolean + `part_count` int |

---

## 1. Repository Scaffold

The `apps/api/` directory will be created adjacent to the existing `apps/web/`:

```
apps/api/
├── alembic/
│   ├── versions/
│   │   └── 0001_initial_schema.py
│   └── env.py
├── app/
│   ├── __init__.py
│   ├── main.py                    ← FastAPI app factory + lifespan
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              ← pydantic-settings Settings
│   │   ├── security.py            ← Clerk JWT validation dependency
│   │   ├── deps.py                ← DB session, current_user FastAPI deps
│   │   └── quota.py               ← Quota enforcement (plan-aware, per-task)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py                ← DeclarativeBase + TimestampMixin
│   │   ├── user.py
│   │   ├── subscription.py
│   │   ├── prompt.py
│   │   ├── attempt.py
│   │   └── calibration.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py              ← PaginatedResponse, HealthResponse
│   │   ├── user.py
│   │   ├── prompt.py
│   │   └── attempt.py
│   ├── repositories/              ← NEW layer (not in general plan)
│   │   ├── __init__.py
│   │   ├── base.py                ← Generic async CRUD repository
│   │   ├── user_repo.py
│   │   ├── prompt_repo.py
│   │   └── attempt_repo.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── attempt_service.py     ← Orchestrates quota + DB write + enqueue
│   │   ├── prompt_service.py
│   │   ├── storage_service.py     ← S3 pre-signed URL logic
│   │   └── user_service.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py              ← APIRouter: registers all sub-routers
│   │   └── v1/
│   │       ├── health.py
│   │       ├── users.py
│   │       ├── speaking.py
│   │       ├── writing.py
│   │       ├── attempts.py
│   │       └── admin.py
│   └── workers/
│       ├── __init__.py
│       ├── celery_app.py
│       ├── speaking_tasks.py      ← STUB (Phase 2 replaces body)
│       └── writing_tasks.py       ← STUB (Phase 2 replaces body)
├── tests/
│   ├── conftest.py
│   ├── test_health.py
│   ├── test_speaking.py
│   ├── test_writing.py
│   └── test_quota.py
├── scripts/
│   └── seed_prompts.py
├── .env.example
├── alembic.ini
├── Dockerfile
├── requirements.txt
└── pyproject.toml                 ← ruff + mypy config
```

> [!NOTE]
> The **Repository layer** (`app/repositories/`) is explicitly added — it was omitted from the
> general plan but is essential for production-grade code. Services call repositories (SQL
> queries). Routes call services (business logic). This keeps each layer testable in isolation.

---

## 2. Environment & Configuration

### `app/core/config.py`

Uses `pydantic-settings` with `.env` file. Full list of required env vars:

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_ENV:   str  = "development"
    APP_NAME:  str  = "CELPIP Platform API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG:     bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Database
    DATABASE_URL: str   # postgresql+asyncpg://celpip:celpip@db:5432/celpip_dev

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # Clerk Auth
    CLERK_SECRET_KEY:      str
    CLERK_PUBLISHABLE_KEY: str
    CLERK_JWKS_URL:        str = "https://api.clerk.dev/v1/jwks"

    # AWS S3 / Cloudflare R2
    S3_BUCKET_NAME:          str
    S3_REGION:               str  = "us-east-1"
    S3_ENDPOINT_URL:         str | None = None   # R2: https://<acct>.r2.cloudflarestorage.com
    AWS_ACCESS_KEY_ID:       str
    AWS_SECRET_ACCESS_KEY:   str
    S3_UPLOAD_EXPIRY_SECS:   int  = 900    # 15 min for upload URL
    S3_DOWNLOAD_EXPIRY_SECS: int  = 3600   # 1 hr for authenticated playback
    S3_AUDIO_PREFIX:         str  = "audio/"

    # Quotas (match constants.ts STARTER/PRO/ULTRA_PLAN_LIMITS)
    STARTER_SPEAKING_MOCK_TESTS: int = 1
    STARTER_WRITING_MOCK_TESTS:  int = 1
    PRO_SPEAKING_PER_TASK:       int = 5
    PRO_WRITING_PER_TASK:        int = 5
    PRO_SPEAKING_MOCK_TESTS:     int = 2
    PRO_WRITING_MOCK_TESTS:      int = 2
    ULTRA_SPEAKING_PER_TASK:     int = 15
    ULTRA_WRITING_PER_TASK:      int = 15
    ULTRA_SPEAKING_MOCK_TESTS:   int = 5
    ULTRA_WRITING_MOCK_TESTS:    int = 5

    # AI (Phase 2 — config entries exist now, wired in Phase 2)
    AI_SCORING_PROVIDER: str = "openai"
    AI_SCORING_MODEL:    str = "gpt-4o-mini"
    AI_STT_MODEL:        str = "whisper-1"
    OPENAI_API_KEY:      str = ""
```

---

## 3. Database Schema (Phase 1 — Corrected for UI Contract)

> [!IMPORTANT]
> The schema below **overrides** the general plan's `free/premium` plan naming.
> All plan values use `starter | pro | ultra` to match `lib/constants.ts` exactly.

```sql
-- USERS
CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id    TEXT UNIQUE NOT NULL,
    email            TEXT UNIQUE NOT NULL,
    full_name        TEXT,
    plan             TEXT NOT NULL DEFAULT 'starter'
                     CHECK (plan IN ('starter', 'pro', 'ultra')),
    is_admin         BOOLEAN NOT NULL DEFAULT FALSE,
    streak_days      INT     NOT NULL DEFAULT 0,
    last_active_date DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);

-- SPEAKING PROMPTS
CREATE TABLE speaking_prompts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number           INT  NOT NULL CHECK (task_number BETWEEN 0 AND 8),
    title                 TEXT NOT NULL,
    prompt_text           TEXT NOT NULL,
    context_image_url     TEXT,
    prep_time_seconds     INT  NOT NULL,
    response_time_seconds INT  NOT NULL,
    difficulty            TEXT NOT NULL DEFAULT 'medium'
                          CHECK (difficulty IN ('easy', 'medium', 'hard')),
    has_parts             BOOLEAN NOT NULL DEFAULT FALSE,
    part_count            INT     NOT NULL DEFAULT 1,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    sample_response_text  TEXT,
    vocabulary_tips       TEXT[]  NOT NULL DEFAULT '{}',
    connector_phrases     TEXT[]  NOT NULL DEFAULT '{}',
    template_hint         TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_speaking_prompts_task ON speaking_prompts(task_number);

-- WRITING PROMPTS
CREATE TABLE writing_prompts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number           INT  NOT NULL CHECK (task_number IN (1, 2)),
    title                 TEXT NOT NULL,
    prompt_text           TEXT NOT NULL,
    task_type             TEXT NOT NULL,
    min_words             INT  NOT NULL,
    max_words             INT,
    time_limit_seconds    INT  NOT NULL,
    difficulty            TEXT NOT NULL DEFAULT 'medium'
                          CHECK (difficulty IN ('easy', 'medium', 'hard')),
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    sample_response_text  TEXT,
    idea_hints            TEXT[]  NOT NULL DEFAULT '{}',
    intro_template        TEXT,
    conclusion_template   TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_writing_prompts_task ON writing_prompts(task_number);

-- ATTEMPTS (parent table)
CREATE TABLE attempts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill            TEXT NOT NULL CHECK (skill IN ('speaking', 'writing')),
    prompt_id        UUID NOT NULL,
    task_number      INT  NOT NULL,   -- denormalised: fast quota COUNT queries
    status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','complete','failed','cancelled')),
    celery_task_id   TEXT,
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attempts_user_id ON attempts(user_id);
CREATE INDEX idx_attempts_status  ON attempts(status);
-- Critical: quota query is (user_id, skill, task_number)
CREATE INDEX idx_attempts_quota   ON attempts(user_id, skill, task_number);

-- SPEAKING ATTEMPTS
CREATE TABLE speaking_attempts (
    attempt_id        UUID PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
    audio_s3_key      TEXT,
    audio_duration_ms INT,
    upload_completed  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WRITING ATTEMPTS
CREATE TABLE writing_attempts (
    attempt_id     UUID PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
    essay_text     TEXT,
    word_count     INT,
    char_count     INT,
    auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CALIBRATION SAMPLES
CREATE TABLE calibration_samples (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill        TEXT NOT NULL CHECK (skill IN ('speaking', 'writing')),
    task_number  INT,
    band_level   NUMERIC(3,1) NOT NULL,
    sample_text  TEXT NOT NULL,
    source       TEXT NOT NULL DEFAULT 'official',
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_calibration_skill_task ON calibration_samples(skill, task_number);

-- SUBSCRIPTIONS (stub for Phase 3 Stripe)
CREATE TABLE subscriptions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id     TEXT,
    plan                   TEXT NOT NULL CHECK (plan IN ('pro', 'ultra')),
    status                 TEXT NOT NULL,
    current_period_end     TIMESTAMPTZ,
    canceled_at            TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
```

---

## 4. SQLAlchemy 2.0 Models

### `app/models/base.py`
```python
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False
    )
```

### `app/models/prompt.py` (illustrative)
```python
class SpeakingPrompt(Base, TimestampMixin):
    __tablename__ = "speaking_prompts"

    id:                    Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    task_number:           Mapped[int]
    title:                 Mapped[str]
    prompt_text:           Mapped[str]
    context_image_url:     Mapped[str | None]
    prep_time_seconds:     Mapped[int]
    response_time_seconds: Mapped[int]
    difficulty:            Mapped[str]    = mapped_column(default="medium")
    has_parts:             Mapped[bool]   = mapped_column(default=False)
    part_count:            Mapped[int]    = mapped_column(default=1)
    is_active:             Mapped[bool]   = mapped_column(default=True)
    sample_response_text:  Mapped[str | None]
    vocabulary_tips:       Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    connector_phrases:     Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    template_hint:         Mapped[str | None]
```

> [!TIP]
> All models use **`Mapped[]` typed annotations** (SQLAlchemy 2.0 style) — no `Column()` calls.
> This enables full mypy type checking on ORM queries.

---

## 5. Pydantic v2 Schemas — API Contract

These schemas define the **exact JSON shape** that `lib/types.ts` expects.

### `app/schemas/prompt.py`
```python
class SpeakingTaskResponse(BaseModel):
    """Maps 1:1 to frontend SpeakingTask interface."""
    model_config = ConfigDict(from_attributes=True)

    id:                    UUID
    task_number:           int
    title:                 str
    prep_time_seconds:     int
    response_time_seconds: int
    prompt_text:           str
    difficulty:            str
    vocabulary_tips:       list[str]
    connector_phrases:     list[str]
    template_hint:         str | None
    has_parts:             bool
    part_count:            int

class WritingTaskResponse(BaseModel):
    """Maps 1:1 to frontend WritingTask interface."""
    model_config = ConfigDict(from_attributes=True)

    id:                  UUID
    task_number:         int
    title:               str
    task_type:           str
    time_limit_seconds:  int
    min_words:           int
    max_words:           int | None
    prompt_text:         str
    idea_hints:          list[str]
    intro_template:      str | None
    conclusion_template: str | None
```

### `app/schemas/attempt.py`
```python
class StartSpeakingAttemptRequest(BaseModel):
    prompt_id: UUID

class StartAttemptResponse(BaseModel):
    attempt_id: UUID
    status: str
    created_at: datetime

class UploadUrlResponse(BaseModel):
    upload_url:         str    # S3 pre-signed PUT URL
    s3_key:             str
    expires_in_seconds: int

class ConfirmUploadRequest(BaseModel):
    s3_key:            str
    audio_duration_ms: int

class StartWritingAttemptRequest(BaseModel):
    prompt_id: UUID

class SubmitWritingRequest(BaseModel):
    essay_text:     str
    auto_submitted: bool = False

class AttemptStatusResponse(BaseModel):
    """Maps to frontend Attempt interface (status polling)."""
    attempt_id:       UUID
    status:           str    # pending|processing|complete|failed
    skill:            str
    celery_task_id:   str | None
    error_message:    str | None
    report_available: bool   # True when status == 'complete'
    created_at:       datetime
    updated_at:       datetime

class QuotaStatusResponse(BaseModel):
    """Maps to frontend useQuota hook expectations."""
    plan:                    str
    speaking_used_per_task:  dict[int, int]   # {task_number: count}
    writing_used_per_task:   dict[int, int]
    speaking_limit_per_task: int | None
    writing_limit_per_task:  int | None
    can_attempt_speaking:    dict[int, bool]
    can_attempt_writing:     dict[int, bool]
```

### `app/schemas/user.py`
```python
class UserMeResponse(BaseModel):
    """Maps 1:1 to frontend AppUser interface."""
    model_config = ConfigDict(from_attributes=True)

    id:               str
    clerk_id:         str
    full_name:        str
    email:            str
    plan:             str       # starter | pro | ultra
    role:             str       # user | admin
    streak_days:      int
    last_active_date: str | None
    target_band:      float | None

class SetTargetScoreRequest(BaseModel):
    target_band: float = Field(ge=1, le=12)
```

---

## 6. Repository Layer

The repository pattern keeps all SQL in one place — services never write raw queries.

### `app/repositories/base.py`
```python
class BaseRepository(Generic[ModelT]):
    def __init__(self, model: Type[ModelT], session: AsyncSession) -> None:
        self.model   = model
        self.session = session

    async def get_by_id(self, id: UUID) -> ModelT | None:
        return await self.session.get(self.model, id)

    async def list_all(self, **filters) -> list[ModelT]:
        q = select(self.model)
        for k, v in filters.items():
            q = q.where(getattr(self.model, k) == v)
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def create(self, **kwargs) -> ModelT:
        obj = self.model(**kwargs)
        self.session.add(obj)
        await self.session.flush()
        return obj
```

### `app/repositories/attempt_repo.py` — quota-critical queries
```python
class AttemptRepository(BaseRepository[Attempt]):
    async def count_by_user_skill_task(
        self, user_id: UUID, skill: str, task_number: int
    ) -> int:
        """Hits idx_attempts_quota composite index. Called inside quota enforcement."""
        result = await self.session.execute(
            select(func.count(Attempt.id))
            .where(Attempt.user_id     == user_id)
            .where(Attempt.skill       == skill)
            .where(Attempt.task_number == task_number)
            .where(Attempt.status.not_in(["cancelled"]))
            .with_for_update(skip_locked=True)
        )
        return result.scalar_one()

    async def get_status(self, attempt_id: UUID, user_id: UUID) -> Attempt | None:
        """Single indexed read — safe for 3-second polling cadence."""
        result = await self.session.execute(
            select(Attempt)
            .where(Attempt.id      == attempt_id)
            .where(Attempt.user_id == user_id)   # row-level isolation
        )
        return result.scalar_one_or_none()

    async def paginated_history(
        self, user_id: UUID, skill: str | None, page: int, per_page: int
    ) -> tuple[list[Attempt], int]:
        q = select(Attempt).where(Attempt.user_id == user_id)
        if skill:
            q = q.where(Attempt.skill == skill)
        count_result = await self.session.execute(
            select(func.count()).select_from(q.subquery())
        )
        total = count_result.scalar_one()
        result = await self.session.execute(
            q.order_by(Attempt.created_at.desc())
             .offset((page - 1) * per_page)
             .limit(per_page)
        )
        return list(result.scalars().all()), total
```

---

## 7. Quota Enforcement

> [!IMPORTANT]
> The quota model changed from the general plan. The UI uses **per-task, per-skill limits**.
> The backend must match `lib/constants.ts` exactly.

### `app/core/quota.py`
```python
"""
Quota rules (matching lib/constants.ts):
  starter: mock tests only (1 speaking, 1 writing); task practice = locked
  pro:     5 attempts per task + 2 mock tests per skill
  ultra:   15 attempts per task + 5 mock tests per skill
"""
async def enforce_quota(
    user: User,
    skill: str,
    task_number: int,
    is_mock_test: bool,
    db: AsyncSession,
) -> None:
    """
    Raises HTTP 402 if the user is over-quota.
    Must be called inside the attempt creation transaction.
    """
    repo   = AttemptRepository(db)
    limits = _get_limits(user.plan, skill)

    if user.plan == "starter" and not is_mock_test:
        raise HTTPException(
            status_code=402,
            detail={
                "code":        "STARTER_TASK_PRACTICE_LOCKED",
                "message":     "Task practice requires a Pro or Ultra plan.",
                "upgrade_url": "/billing",
            },
        )

    if is_mock_test and limits.mock_tests is not None:
        used = await repo.count_mock_tests_by_user_skill(user.id, skill)
        if used >= limits.mock_tests:
            raise HTTPException(status_code=402, detail={
                "code": "QUOTA_EXCEEDED",
                "used": used, "limit": limits.mock_tests,
            })

    if not is_mock_test and limits.per_task is not None:
        used = await repo.count_by_user_skill_task(user.id, skill, task_number)
        if used >= limits.per_task:
            raise HTTPException(status_code=402, detail={
                "code": "QUOTA_EXCEEDED",
                "used": used, "limit": limits.per_task,
            })
```

---

## 8. Security — Clerk JWT Middleware

### `app/core/security.py`
```python
@lru_cache(maxsize=1)
def _get_cached_jwks() -> dict:
    """Sync fetch — called once and cached in-process."""
    response = httpx.get(settings.CLERK_JWKS_URL, timeout=10.0)
    response.raise_for_status()
    return response.json()

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db:          Annotated[AsyncSession, Depends(get_db)],
) -> User:
    exc = HTTPException(status_code=401, detail="Could not validate credentials",
                        headers={"WWW-Authenticate": "Bearer"})
    try:
        token  = credentials.credentials
        jwks   = _get_cached_jwks()
        header = jwt.get_unverified_header(token)
        key    = next((k for k in jwks["keys"] if k["kid"] == header.get("kid")), None)
        if not key:
            raise exc
        payload: dict = jwt.decode(token, jwk.construct(key),
                                   algorithms=["RS256"],
                                   options={"verify_aud": False})
        clerk_user_id: str = payload["sub"]
        email:         str = payload.get("email", "")
        full_name:     str = payload.get("name", "")
    except (JWTError, KeyError):
        logger.warning("JWT validation failed", exc_info=True)
        raise exc

    return await get_or_create_user(db, clerk_user_id, email, full_name)

async def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user
```

---

## 9. Complete API Route Map

All routes prefixed `/api/v1`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | DB ping + Redis ping |
| `GET` | `/users/me` | User | Current user → `UserMeResponse` |
| `PATCH` | `/users/me/target-score` | User | Set target band (1–12) |
| `GET` | `/users/me/quota` | User | Per-task quota → `QuotaStatusResponse` |
| `GET` | `/speaking/tasks` | User | All active prompts → `list[SpeakingTaskResponse]` |
| `GET` | `/speaking/tasks/{task_number}` | User | Single task detail |
| `POST` | `/speaking/attempts/start` | User | Create attempt (quota check inside txn) |
| `POST` | `/speaking/attempts/{id}/upload-url` | User | Pre-signed S3 PUT URL |
| `POST` | `/speaking/attempts/{id}/confirm-upload` | User | Mark upload done + enqueue Celery |
| `GET` | `/writing/tasks` | User | Both writing tasks |
| `GET` | `/writing/tasks/{task_number}` | User | Single writing task |
| `POST` | `/writing/attempts/start` | User | Create attempt (quota check) |
| `POST` | `/writing/attempts/{id}/submit` | User | Save essay + server word count + enqueue |
| `GET` | `/attempts/{id}/status` | User | Lightweight poll — single indexed read |
| `GET` | `/attempts/{id}/report` | User | Full report (Phase 2); Phase 1 → 404 |
| `GET` | `/history` | User | Paginated `?skill=&page=&per_page=` |
| `GET` | `/admin/prompts/speaking` | Admin | All prompts (incl. inactive) |
| `POST` | `/admin/prompts/speaking` | Admin | Create speaking prompt |
| `PUT` | `/admin/prompts/speaking/{id}` | Admin | Update prompt |
| `DELETE` | `/admin/prompts/speaking/{id}` | Admin | Soft-delete (`is_active=false`) |
| `GET` | `/admin/prompts/writing` | Admin | All writing prompts |
| `POST` | `/admin/prompts/writing` | Admin | Create writing prompt |
| `PUT` | `/admin/prompts/writing/{id}` | Admin | Update writing prompt |
| `DELETE` | `/admin/prompts/writing/{id}` | Admin | Soft-delete |
| `GET` | `/admin/calibration` | Admin | List calibration samples |
| `POST` | `/admin/calibration` | Admin | Add calibration sample |
| `PATCH` | `/admin/calibration/{id}` | Admin | Toggle `is_active` |

---

## 10. Key Route Implementations

### Speaking — Start Attempt
```python
@router.post("/attempts/start", response_model=StartAttemptResponse, status_code=201)
async def start_speaking_attempt(
    body: StartSpeakingAttemptRequest,
    user: Annotated[User, Depends(get_current_user)],
    db:   Annotated[AsyncSession, Depends(get_db)],
) -> StartAttemptResponse:
    """
    Quota check + attempt creation run inside ONE DB transaction.
    On quota failure → rolls back → no orphan attempt records.
    """
    return await attempt_service.start_speaking(db=db, user=user, prompt_id=body.prompt_id)
```

### Writing — Submit
```python
@router.post("/attempts/{attempt_id}/submit", response_model=StartAttemptResponse)
async def submit_writing(
    attempt_id:  UUID,
    body:        SubmitWritingRequest,
    user:        Annotated[User, Depends(get_current_user)],
    db:          Annotated[AsyncSession, Depends(get_db)],
) -> StartAttemptResponse:
    """
    Server-side word count is authoritative (not the client's).
    Enqueues writing Celery task; transitions attempt → 'processing'.
    """
    return await attempt_service.submit_writing(
        db=db, user=user, attempt_id=attempt_id,
        essay_text=body.essay_text, auto_submitted=body.auto_submitted,
    )
```

### Health Check
```python
@router.get("/health")
async def health(db: Annotated[AsyncSession, Depends(get_db)]) -> JSONResponse:
    """Called by Docker HEALTHCHECK and CI smoke test."""
    db_ok, redis_ok = False, False
    try:
        await db.execute(text("SELECT 1")); db_ok = True
    except Exception: pass
    try:
        await get_redis().ping(); redis_ok = True
    except Exception: pass
    code = 200 if (db_ok and redis_ok) else 503
    return JSONResponse(status_code=code, content={
        "db": "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "error",
    })
```

---

## 11. Storage Service (S3 / Cloudflare R2)

### `app/services/storage_service.py`
```python
"""
Audio key format: audio/{user_id}/{attempt_id}.webm
Supports AWS S3 and Cloudflare R2 via S3_ENDPOINT_URL config override.
"""
@lru_cache(maxsize=1)
def _get_s3_client():
    kwargs = dict(
        region_name           = settings.S3_REGION,
        aws_access_key_id     = settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key = settings.AWS_SECRET_ACCESS_KEY,
    )
    if settings.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
    return boto3.client("s3", **kwargs)

def generate_upload_url(user_id: str, attempt_id: str) -> tuple[str, str]:
    """Returns (presigned_url, s3_key)."""
    s3_key = f"{settings.S3_AUDIO_PREFIX}{user_id}/{attempt_id}.webm"
    url = _get_s3_client().generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key,
                "ContentType": "audio/webm"},
        ExpiresIn=settings.S3_UPLOAD_EXPIRY_SECS,
    )
    return url, s3_key

def generate_download_url(s3_key: str) -> str:
    """Phase 2: return playback URL on report page."""
    return _get_s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=settings.S3_DOWNLOAD_EXPIRY_SECS,
    )
```

---

## 12. Celery — Worker Stubs

### `app/workers/celery_app.py`
```python
celery_app = Celery("celpip_workers", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_serializer            = "json",
    result_serializer          = "json",
    accept_content             = ["json"],
    timezone                   = "UTC",
    task_routes                = {
        "app.workers.speaking_tasks.*": {"queue": "speaking"},
        "app.workers.writing_tasks.*":  {"queue": "writing"},
    },
    task_acks_late             = True,   # ack after completion — safe retries
    worker_prefetch_multiplier = 1,
)
```

### `app/workers/speaking_tasks.py`
```python
@shared_task(
    name="speaking.process_attempt", bind=True,
    max_retries=3, default_retry_delay=30, autoretry_for=(Exception,),
)
def process_speaking_attempt(self, attempt_id: str) -> dict:
    """
    PHASE 1 STUB — log receipt only.
    Phase 2: STT (Whisper) → rubric LLM → write score_reports → status=complete.
    """
    logger.info("[STUB] speaking.process_attempt received attempt_id=%s", attempt_id)
    return {"attempt_id": attempt_id, "status": "stub_received"}
```

---

## 13. FastAPI App Factory

### `app/main.py`
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()    # clean connection pool shutdown

def create_app() -> FastAPI:
    app = FastAPI(
        title    = settings.APP_NAME,
        version  = "1.0.0",
        docs_url = "/docs" if settings.DEBUG else None,
        lifespan = lifespan,
    )
    app.add_middleware(CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)
    return app

app = create_app()
```

---

## 14. Seed Script

Seeds all 9 speaking prompts (practice + Tasks 1–8) and both writing prompts.
**Idempotent** — detects existing rows by `task_number` and skips.

| Task | Title | Prep | Response | has_parts |
|---|---|---|---|---|
| 0 (prac) | Practice Task | 30s | 60s | false |
| 1 | Giving Advice | 30s | 90s | false |
| 2 | Talking about a Personal Experience | 30s | 60s | false |
| 3 | Describing a Scene | 30s | 60s | false |
| 4 | Making Predictions | 30s | 60s | false |
| **5** | **Comparing and Persuading** | **60s** | **60s** | **true** (part_count=2) |
| 6 | Dealing with a Difficult Situation | 30s | 60s | false |
| 7 | Expressing Opinions | 30s | 90s | false |
| 8 | Describing an Unusual Situation | 30s | 60s | false |

| Task | Type | Time | Min/Max Words |
|---|---|---|---|
| 1 | Email Format | 27 min | 150–200 |
| 2 | Opinion Essay | 26 min | 150–200 |

---

## 15. Docker Compose — Local Dev

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: celpip, POSTGRES_PASSWORD: celpip, POSTGRES_DB: celpip_dev }
    ports: ["5432:5432"]
    volumes: [db_data:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL","pg_isready -U celpip"], interval: 5s, retries: 5 }

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck: { test: ["CMD","redis-cli","ping"], interval: 5s }

  api:
    build: ../apps/api
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports: ["8000:8000"]
    env_file: ../apps/api/.env
    environment:
      DATABASE_URL: postgresql+asyncpg://celpip:celpip@db:5432/celpip_dev
      REDIS_URL:    redis://redis:6379/0
    depends_on: { db: { condition: service_healthy }, redis: { condition: service_healthy } }
    volumes: [../apps/api:/app]

  worker:
    build: ../apps/api
    command: celery -A app.workers.celery_app worker --loglevel=info -Q speaking,writing --concurrency=2
    env_file: ../apps/api/.env
    environment:
      DATABASE_URL: postgresql+asyncpg://celpip:celpip@db:5432/celpip_dev
      REDIS_URL:    redis://redis:6379/0
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

---

## 16. Requirements

```text
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
sqlalchemy>=2.0.29
asyncpg>=0.29.0
alembic>=1.13.1
pydantic>=2.7.0
pydantic-settings>=2.2.1
python-jose[cryptography]>=3.3.0
httpx>=0.27.0
celery>=5.3.6
redis>=5.0.4
flower>=2.0.1
boto3>=1.34.0
ruff>=0.4.0
mypy>=1.9.0
pytest>=8.1.0
pytest-asyncio>=0.23.0
pytest-mock>=3.14.0
```

---

## 17. Tests — Phase 1 Coverage

```python
# tests/test_health.py
async def test_health_returns_200(client):
    r = await client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["db"] == "ok"

# tests/test_speaking.py
async def test_start_speaking_attempt_creates_record(authed_client, seed_speaking_prompt):
    r = await authed_client.post("/api/v1/speaking/attempts/start",
        json={"prompt_id": str(seed_speaking_prompt.id)})
    assert r.status_code == 201
    assert "attempt_id" in r.json()

async def test_upload_url_returns_presigned(authed_client, mock_s3, speaking_attempt):
    r = await authed_client.post(
        f"/api/v1/speaking/attempts/{speaking_attempt.id}/upload-url")
    assert r.status_code == 200
    assert "upload_url" in r.json()

# tests/test_quota.py
async def test_starter_task_practice_blocked(starter_client, seed_speaking_prompt):
    r = await starter_client.post("/api/v1/speaking/attempts/start",
        json={"prompt_id": str(seed_speaking_prompt.id)})
    assert r.status_code == 402
    assert r.json()["detail"]["code"] == "STARTER_TASK_PRACTICE_LOCKED"

async def test_pro_respects_per_task_limit(pro_client, seed_speaking_prompt):
    for _ in range(5):
        await pro_client.post("/api/v1/speaking/attempts/start",
            json={"prompt_id": str(seed_speaking_prompt.id)})
    r = await pro_client.post("/api/v1/speaking/attempts/start",
        json={"prompt_id": str(seed_speaking_prompt.id)})
    assert r.status_code == 402

# tests/test_writing.py
async def test_submit_writing_saves_word_count(authed_client, writing_attempt):
    r = await authed_client.post(
        f"/api/v1/writing/attempts/{writing_attempt.id}/submit",
        json={"essay_text": "Hello world " * 80, "auto_submitted": False}
    )
    assert r.status_code == 200
```

---

## 18. Frontend Wiring — What Changes After Backend Is Live

The UI architecture was designed for zero-friction wiring. These are the **only** changes needed:

| File | Change |
|---|---|
| `apps/web/.env.local` | Set `NEXT_PUBLIC_USE_MOCK=false` |
| `lib/api.ts` | Add `getToken()` Clerk call → attach `Authorization: Bearer <JWT>` header |
| `lib/hooks/useCurrentUser.ts` | Call real `GET /users/me` |
| `lib/hooks/usePrompts.ts` | Remove mock guard → call real `/speaking/tasks` and `/writing/tasks` |
| `lib/hooks/useSpeakingAttempt.ts` | Replace mock attempt ID with `POST /speaking/attempts/start`; replace mock upload with real S3 flow → `/confirm-upload` |
| `lib/hooks/useWritingAttempt.ts` | Replace mock with `POST /writing/attempts/start` + `/submit` |
| `lib/hooks/useAttemptStatus.ts` | Remove `USE_MOCK` guard — already polls correct endpoint |
| `lib/hooks/useQuota.ts` | Wire to `GET /users/me/quota` |

> [!TIP]
> Because every hook already has a `USE_MOCK` split, wiring is a series of **small, isolated
> changes per hook**. Each hook can be toggled independently for incremental testing — start
> with `usePrompts`, verify task list loads, then wire `useSpeakingAttempt`, and so on.

---

## 19. Day-by-Day Build Order

| Day | Deliverable | Exit Criteria |
|---|---|---|
| **Day 1** | `apps/api/` scaffold: config, deps, models, base repo, alembic migration, Dockerfile, requirements | `make migrate` runs clean; `alembic heads` shows 1 migration; DB tables created |
| **Day 2** | Security middleware, user service (upsert), `GET /health`, `GET /users/me`, `PATCH /users/me/target-score`, `GET /users/me/quota` | `/health` → 200; JWT auth passes with real Clerk dev token |
| **Day 3** | All speaking routes: list tasks, start attempt, upload URL, confirm upload | Postman: start attempt → get S3 URL → confirm upload → attempt row in DB |
| **Day 4** | All writing routes: list tasks, start attempt, submit; `GET /attempts/{id}/status`; `GET /history` | Full writing flow in Postman; attempt transitions to `processing` |
| **Day 5** | Admin routes (CRUD prompts + calibration), seed script, `make seed` | Seed script populates all 11 prompts; admin CRUD verified |
| **Day 6** | Quota enforcement tests + all unit tests; mypy + ruff clean | `pytest tests/ -v` → all pass; 402 blocks fire correctly |
| **Day 7** | Frontend wiring: swap `USE_MOCK=false`, wire auth header, smoke test in browser | End-to-end speaking + writing session works in browser against real API |

---

## 20. Verification Checklist

```
Infrastructure
  [ ] docker compose up --build → all 5 services healthy
  [ ] GET /health → { "db": "ok", "redis": "ok" }
  [ ] Flower UI at :5555 shows worker connected
  [ ] alembic upgrade head → clean

Auth
  [ ] Unauthenticated → 401 on all protected routes
  [ ] Valid Clerk JWT → user upserted in DB on first visit
  [ ] Non-admin → 403 on admin routes; admin → 200

Speaking Flow
  [ ] GET /speaking/tasks → 9 tasks; task 5 has has_parts=true, part_count=2
  [ ] POST /speaking/attempts/start → 201 with attempt_id
  [ ] Starter user trying task practice → 402 STARTER_TASK_PRACTICE_LOCKED
  [ ] POST /speaking/attempts/{id}/upload-url → pre-signed S3 PUT URL returned
  [ ] POST /speaking/attempts/{id}/confirm-upload → Celery task visible in Flower
  [ ] GET /attempts/{id}/status → { "status": "processing" }

Writing Flow
  [ ] POST /writing/attempts/{id}/submit → word_count stored server-side
  [ ] auto_submitted flag persisted correctly

Quota
  [ ] Pro: 6th attempt on same task → 402
  [ ] Ultra: 16th attempt on same task → 402

Admin
  [ ] POST /admin/prompts/speaking → creates prompt
  [ ] DELETE /admin/prompts/speaking/{id} → is_active=false (soft-delete)

Tests
  [ ] pytest tests/ -v → all green
  [ ] No real external calls (AI/Clerk mocked in tests)
  [ ] mypy app/ → 0 errors
  [ ] ruff check . → 0 violations
```

---

> [!IMPORTANT]
> **Phase 2 is a stub-body replacement, not a re-architecture.**
> By end of Phase 1, every Celery task, every service, every repo query is wired and tested.
> Phase 2 opens `speaking_tasks.py`, replaces the 5-line stub body with the real AI pipeline
> (Whisper → GPT-4o-mini rubric), and adds `score_reports`/`transcripts` tables via a new
> Alembic migration. No existing routes change. No schemas change.
