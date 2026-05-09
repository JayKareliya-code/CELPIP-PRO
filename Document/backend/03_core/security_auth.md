# CELPIP PRO — Security & Authentication

**Author:** Senior Software Engineer  
**File:** `apps/api/app/core/security.py`  
**Auth Provider:** Clerk (JWT RS256)

---

## 1. Overview

Authentication is handled by **Clerk**. Every protected API route uses the
`get_current_user` FastAPI dependency, which:

1. Extracts the `Bearer` token from the `Authorization` header
2. Fetches Clerk's **JWKS** (JSON Web Key Set) — cached in-memory for 1 hour
3. Verifies the JWT signature (RS256) and decodes the payload
4. Lazily creates or fetches the local `User` row via `get_or_create_user()`

Admin routes additionally require `require_admin`, which cross-checks the
Clerk Backend API for the user's `publicMetadata.role`.

---

## 2. `get_current_user` Dependency

**Signature:**
```python
async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials,
    db: AsyncSession,
) -> User
```

**Input:** `Authorization: Bearer <clerk_jwt>`  
**Output:** Authenticated `User` ORM row (created if first login)  
**Raises:** `HTTP 401` on any validation failure

### Flow

```
Bearer token received
    ↓
Dev bypass? (APP_ENV=development + token starts with "test_token_")
    ↓ No
Fetch JWKS from Clerk (or return 1-hour cache)
    ↓
Match token kid → public key
    ↓
jwt.decode(RS256, verify_aud=False)
    ↓
Extract: sub (clerk_user_id), email, full_name
    ↓
get_or_create_user(db, clerk_user_id, email, full_name)
    ↓
Return User row
```

### JWKS Cache
- **TTL:** 3600 seconds (1 hour)
- **Concurrency safe:** Protected by `asyncio.Lock` — only one coroutine
  fetches at a time; others wait on the lock and re-use the result.
- **Key rotation:** On cache miss the full JWKS is re-fetched, supporting
  automatic Clerk key rotation.

### `X-User-Date` Header
Every request optionally sends `X-User-Date: YYYY-MM-DD` (the user's local
calendar date). `get_current_user` parses this and passes it to
`get_or_create_user` so that the **streak counter** runs against the user's
timezone, not the server's UTC clock.

### Dev Bypass
In `APP_ENV=development` only, a token of the form `test_token_<clerk_user_id>`
is accepted without signature verification. This is a development-only escape
hatch — the guard is a hard code-path check, not just a config flag.

---

## 3. `require_admin` Dependency

**Signature:**
```python
async def require_admin(
    user: User,  # resolved by get_current_user
    db: AsyncSession,
) -> User
```

**Input:** Authenticated `User` from `get_current_user`  
**Output:** Same `User` if admin  
**Raises:** `HTTP 403` if not admin

### Authority Order (first match wins)

| Priority | Source | TTL |
|----------|--------|-----|
| 1 | Clerk `publicMetadata.role == "admin"` (Backend API) | 60-second cache |
| 2 | Local DB `user.is_admin == True` | Live DB value |

### DB Sync
When Clerk reports a role change (grant or revoke), the local `user.is_admin`
flag is synced immediately via `db.flush()`. This keeps audit logs and DB
queries consistent without an extra round-trip on the next request.

### Clerk Role Cache
```python
_clerk_role_cache: dict[str, tuple[str | None, float]]
# { clerk_user_id: (role, fetched_at_monotonic) }
_CLERK_ROLE_TTL = 60.0  # seconds
```
A process-local dict. On cache miss, calls `GET https://api.clerk.com/v1/users/{id}`
with `Authorization: Bearer CLERK_SECRET_KEY`. On Clerk API failure, falls back
to stale cache (or `None`) rather than blocking the request.

---

## 4. `core/deps.py` — Shared FastAPI Dependencies

| Dependency | Returns | Description |
|------------|---------|-------------|
| `get_db()` | `AsyncSession` | Yields a scoped async SQLAlchemy session; commits on success, rolls back on exception |
| `get_read_db()` | `AsyncSession` | Same, but uses `DATABASE_READ_URL` engine if configured (read replica) |
| `get_redis_pool()` | `aioredis.Redis` | Singleton Redis connection pool (initialised at import time) |
| `engine` | `AsyncEngine` | The primary SQLAlchemy async engine (used in lifespan disposal) |

---

## 5. `core/rate_limit.py` — Rate Limiting

**Library:** `slowapi` (Starlette-compatible wrapper around `limits`)  
**Backend:** Redis (same `REDIS_URL` as Celery)

```python
limiter = Limiter(key_func=get_remote_address)
```

Applied per-route via `@limiter.limit(settings.RATE_LIMIT_ATTEMPTS_PER_MIN)`.

| Route Group | Default Limit | Config Variable |
|-------------|--------------|-----------------|
| Attempt creation | `10/minute` | `RATE_LIMIT_ATTEMPTS_PER_MIN` |
| Essay/audio submission | `10/minute` | `RATE_LIMIT_SUBMISSIONS_PER_MIN` |
| Stripe checkout | `5/minute` | `RATE_LIMIT_CHECKOUT_PER_MIN` |
| Everything else | `120/minute` | `RATE_LIMIT_DEFAULT` |

**On exceed:** Returns `HTTP 429 Too Many Requests`.

---

## 6. `core/middleware.py` — RequestIDMiddleware

Injects a unique `X-Request-ID` UUID into every request/response pair.
Applied as the **first** middleware so the ID is available to all subsequent
layers including logs, Sentry breadcrumbs, and the response headers.

```
Request → assign uuid4 → attach to request.state.request_id
Response → add X-Request-ID header
```

---

## 7. `core/feature_flags.py` — Feature Flags

Supports two backends (first configured wins):

| Backend | Config | Description |
|---------|--------|-------------|
| Unleash | `UNLEASH_URL` + `UNLEASH_TOKEN` | Self-hosted Unleash server |
| Env-var JSON | `FEATURE_FLAGS_JSON` | JSON dict — works with no extra dependencies |

Unknown flags always default to `False` (closed/safe). Flags are exposed to
the frontend via `GET /api/v1/feature-flags`.
