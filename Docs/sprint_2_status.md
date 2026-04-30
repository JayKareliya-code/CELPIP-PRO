# Sprint 2 — Implementation Status

> Companion to: [`implementation_plan_sprint_2_steps.md`](implementation_plan_sprint_2_steps.md)
> Last updated: 2026-04-23

---

## Overall progress

| Step | Items | Status |
|------|-------|--------|
| **Step 1 — Week 1 quick wins** | S2-5, S2-13, S2-12, S2-10 | ✅ **Code complete** — needs `docker compose build` + test run inside the container |
| Step 2 — Week 2 billing + ops | S2-2, S2-9, S2-3 | ⏳ Not started |
| Step 3 — Week 3 scalability + observability | S2-1, S2-6, S2-11 | ⏳ Not started |
| Step 4 — Week 4 user-facing features | S2-4, S2-7, S2-8 | ⏳ Not started |

---

## Step 1 — Implementation summary (DONE)

### S2-5 — Stored-XSS sanitization for admin content

**Files added**
- [`apps/api/app/services/sanitizer.py`](apps/api/app/services/sanitizer.py) — `bleach`-based wrapper. Two helpers:
  - `sanitize_rich_text` — keeps a small allowlist of formatting tags (`p, br, strong, em, ul, ol, li, h1..h6, code, pre, a, blockquote`) plus `href/title/rel` on `<a>`.
  - `sanitize_plain_text` — strips ALL HTML.
  - `sanitize_dict` — bulk-sanitize named keys in a payload dict.

**Files modified**
- [`apps/api/app/api/v1/_prompt_helpers.py`](apps/api/app/api/v1/_prompt_helpers.py) — `remap_prompt_data` now sanitizes `prompt_text`, `sample_response_text`, `template_hint`, `intro_template`, `conclusion_template`, `title`, and string lists (`vocabulary_tips`, `connector_phrases`, `idea_hints`). Covers ALL CMS prompt create/update routes.
- [`apps/api/app/api/v1/admin_materials.py`](apps/api/app/api/v1/admin_materials.py) — wraps `body.model_dump(...)` with `_clean_material_payload` for create/update of learning materials.
- [`apps/api/app/api/v1/admin.py`](apps/api/app/api/v1/admin.py) — legacy admin prompt + calibration endpoints now sanitize via `_clean()` before persist.
- [`apps/api/requirements.txt`](apps/api/requirements.txt) — `bleach>=6.1.0` added.
- [`apps/web/package.json`](apps/web/package.json) — `dompurify@^3.1.6` and `@types/dompurify@^3.0.5` added defensively (no current `dangerouslySetInnerHTML` sites — verified via grep returning zero hits).

**Result:** Any admin who POSTs `<script>alert(1)</script>` in a prompt body now persists the stripped text. No render-side sanitization needed yet because no component renders raw HTML.

---

### S2-13 — Flower basic auth + ops runbook

**Files modified**
- [`docker-compose.yml`](docker-compose.yml) — Flower service now runs with `--basic_auth=admin:${FLOWER_PASSWORD:-changeme}`. `FLOWER_PASSWORD` exported from env.
- [`apps/api/.env.example`](apps/api/.env.example) — `FLOWER_PASSWORD=changeme` added with rotation note.

**Files added**
- [`docs/ops.md`](docs/ops.md) — runbook covering: how to set/rotate the Flower password, why Flower must NOT be publicly routable in production (VPC-only), recommended deployment patterns (AWS ALB / Fly.io 6PN / SSH tunnel), and a fallback for inspecting queues directly with `redis-cli LLEN`.

**Result:** Visiting `localhost:5555` now prompts for HTTP basic auth. **Action item:** set a real `FLOWER_PASSWORD` in your `.env` (currently defaults to `changeme`).

---

### S2-12 — Redis-cached presigned image URLs

**Files modified**
- [`apps/api/app/services/storage/presigner.py`](apps/api/app/services/storage/presigner.py) — added `async def generate_presigned_get_cached(key, expires_in, *, redis)`:
  - Cache key: `presign:get:{expires_in}:{md5(key)}`
  - TTL: `expires_in - 300` (5-min safety margin so we never serve a near-expired URL)
  - Min cacheable TTL: 60 s (skip cache below that)
  - Silent fall-through to direct presigning on any Redis error — image delivery never hard-depends on Redis health
- [`apps/api/app/api/v1/speaking.py`](apps/api/app/api/v1/speaking.py) — `_sign_prompt` and `_sign_option_image` are now async and accept the Redis client. All three image-listing routes (`GET /speaking/tasks`, `GET /speaking/tasks/by-id/{id}`, `GET /speaking/tasks/{n}`) inject `aioredis.Redis` via `get_redis_pool` and use the cached presigner.

**Result:** Repeated `GET /speaking/tasks` calls hit Redis instead of re-running boto3 HMAC + per-image signing. First call signs + caches; subsequent calls within ~115 min serve directly from Redis.

---

### S2-10 — Admin audit log backfill + integration tests

**Audit-call gaps found and fixed**

CMS service-layer endpoints (`admin_prompts`, `admin_materials` create/update/publish/archive) already called `log_action` via the service layer — confirmed during audit, no changes needed.

Gaps that were missing audit calls (now fixed):

| File | Endpoints |
|------|-----------|
| [`apps/api/app/api/v1/admin.py`](apps/api/app/api/v1/admin.py) | `admin_create_speaking`, `admin_update_speaking`, `admin_delete_speaking`, `admin_create_writing`, `admin_update_writing`, `admin_delete_writing`, `admin_create_calibration`, `admin_toggle_calibration` |
| [`apps/api/app/api/v1/admin_assets.py`](apps/api/app/api/v1/admin_assets.py) | `patch_asset`, `add_prompt_image`, `remove_prompt_image` |
| [`apps/api/app/api/v1/admin_tags.py`](apps/api/app/api/v1/admin_tags.py) | `create_tag`, `delete_tag`, `link_tag`, `unlink_tag` |
| [`apps/api/app/api/v1/admin_materials.py`](apps/api/app/api/v1/admin_materials.py) | `set_access_rule` |

All call `log_action` with appropriate `action_type` / `entity_type` / `entity_id` / `new_value` (or `old_value` for deletes). Logging happens before `db.commit()` so it shares the route's transaction — if the mutation rolls back, the audit row rolls back too.

**Files added**
- [`apps/api/tests/test_admin_audit.py`](apps/api/tests/test_admin_audit.py) — 4 integration tests:
  1. Tag create + delete writes `create` and `delete` audit rows.
  2. Tag link + unlink writes `link` and `unlink` audit rows.
  3. Legacy speaking-prompt create + delete writes `create` and `soft_delete` audit rows.
  4. Non-admin caller is rejected at the dependency layer; no audit row written.

---

## How to verify Step 1 inside Docker

```bash
# 1. Rebuild the API + worker images so bleach is installed
docker compose build api worker

# 2. Restart everything (Flower picks up the new basic-auth flag)
docker compose up -d

# 3. Run the test suite inside the api container
docker compose exec api pytest tests/ -x -q

# 4. Smoke-test Flower auth (should prompt for username/password)
curl -i http://localhost:5555/
# → 401 Unauthorized; with creds:
curl -i -u admin:changeme http://localhost:5555/

# 5. Smoke-test presign cache (call twice; second should be ~5-20 ms faster)
docker compose exec redis redis-cli MONITOR &
# Then in another shell:
curl -H "Authorization: Bearer test_token_admin_test_001" http://localhost:8000/api/v1/speaking/tasks
# Watch redis-cli output for `GET presign:get:7200:...` (miss) then `SET ...`
curl -H "Authorization: Bearer test_token_admin_test_001" http://localhost:8000/api/v1/speaking/tasks
# Should now show `GET presign:get:7200:...` returning the cached value
```

If `pytest` fails on import, the api container is missing dev deps. Add to your Dockerfile or run:

```bash
docker compose exec api pip install pytest pytest-asyncio aiosqlite
```

---

## Action items before committing Step 1

- [ ] `docker compose build api worker` to install `bleach`.
- [ ] Set a real `FLOWER_PASSWORD` in your `.env` (replace `changeme`).
- [ ] In `apps/web`, run `npm install` (or `pnpm install`) so the new `dompurify` lockfile lands.
- [ ] Run `pytest tests/` inside the api container — must be green before moving to Step 2.
- [ ] Commit as 4 separate commits per the plan: `s2-5: ...`, `s2-13: ...`, `s2-12: ...`, `s2-10: ...`.

---

## Step 2 preview (NOT YET STARTED)

When you're ready, Step 2 covers:

| Item | What it ships |
|------|---------------|
| **S2-2** | Nightly Celery Beat task that reconciles paid users against Stripe `PaymentIntent.retrieve` and downgrades refunded ones. New migration `0011_reconciliation_log.py`. |
| **S2-9** | `GET /admin/cost-report` endpoint aggregating `ai_cost_log` by user/model/operation, plus an admin-side React page with table + Recharts bar chart. |
| **S2-3** | `app/core/feature_flags.py` wrapper supporting both Unleash (if `UNLEASH_URL` set) and a JSON env-var fallback. New `GET /feature-flags` endpoint + `useFeatureFlags` React hook. |

Estimated diff: ~12 files, 1 new migration, 1 new optional Python dep (`UnleashClient`), no infra changes.

When you say "start step 2", I pick up from there. The plan + status docs together carry all the context — no re-discovery needed.
