# CELPIP PRO — Billing & Admin API Routes

**Author:** Senior Software Engineer  
**Files:** `apps/api/app/api/v1/billing/`, `admin.py`, `admin_prompts.py`, `admin_assets.py`

---

## 1. Billing Routes — `billing/router.py`

Base path: `/api/v1/billing`  
Sub-router mounts: `checkout`, `webhook`, `portal`, `sse_token`, `status`, `events`

---

### `POST /billing/checkout` — `routes/checkout.py`

**Purpose:** Creates a Stripe Checkout Session for plan upgrade.

**Auth:** `get_current_user`  
**Rate limit:** `5/minute` (`RATE_LIMIT_CHECKOUT_PER_MIN`)

**Input (JSON):**
```json
{ "plan": "pro" }
```

**Processing:**
```
1. Validate plan ∈ {"pro", "ultra"}
2. stripe.checkout.Session.create(
     mode="payment",
     line_items=[{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
     metadata={ celpipbro_user_id: user.id, plan: "pro" },
     success_url: FRONTEND_URL/billing?success=true,
     cancel_url:  FRONTEND_URL/billing,
   )
3. Return { checkout_url }
```

**Output:**
```json
{ "checkout_url": "https://checkout.stripe.com/pay/cs_live_..." }
```

**Notes:** `celpipbro_user_id` in Stripe metadata is the primary link used
by the webhook to match the payment to the correct local user row.

---

### `POST /billing/webhook` — `routes/webhook.py`

**Purpose:** Receives and processes Stripe webhook events.  
**Auth:** None (Stripe signature verification instead)  
**Idempotency:** `StripeEvent.event_id` (PK) deduplicates retries

#### Supported Events

| Event | Handler | Effect |
|-------|---------|--------|
| `checkout.session.completed` | `_handle_checkout_completed` | Upgrade `user.plan`, upsert `Subscription`, publish Redis SSE event |
| `charge.refunded` | `_handle_charge_refunded` | Downgrade `user.plan` to `starter`, mark subscription `refunded`, publish Redis SSE event |

#### Signature Verification
```python
event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
```
- Returns `HTTP 400` on invalid signature (Stripe stops retrying after repeated 4xx)
- Returns `HTTP 500` on processing failure (Stripe retries with exponential backoff)
- Returns `HTTP 200` on duplicate event (idempotency short-circuit)

#### Checkout Completed Flow
```
Parse metadata: user_id, plan, customer_id, payment_intent_id
    ↓
Lookup User by UUID
    ↓
UPDATE users SET plan = 'pro'
    ↓
UPSERT subscriptions (stripe_customer_id, stripe_payment_intent_id, status='active')
    ↓
redis.publish("celpip:plan_updates:<user_id>", '{"plan":"pro"}')
    ↓
UPDATE stripe_events SET status = 'processed'
    ↓
COMMIT
```

#### Refund Flow
```
Extract payment_intent_id from charge object
    ↓
SELECT subscription WHERE stripe_payment_intent_id = pi_id
    ↓
UPDATE users SET plan = 'starter'
UPDATE subscriptions SET status = 'refunded'
    ↓
redis.publish("celpip:plan_updates:<user_id>", '{"plan":"starter"}')
```

---

### `POST /billing/portal` — `routes/portal.py`

**Purpose:** Creates a Stripe Customer Portal session so users can manage their
billing, download invoices, or cancel.

**Auth:** `get_current_user`  
**Input:** None  
**Output:** `{ "portal_url": "https://billing.stripe.com/..." }`

Looks up `stripe_customer_id` from the `subscriptions` table. Returns
`HTTP 404` if no subscription found.

---

### `GET /billing/status` — `routes/status.py`

**Purpose:** Returns the current billing status for the authenticated user.

**Output:**
```json
{
  "plan": "pro",
  "subscription_status": "active",
  "stripe_customer_id": "cus_...",
  "payment_type": "one_time"
}
```

---

### `GET /billing/events` — `routes/events.py` (SSE)

**Purpose:** Server-Sent Events endpoint. The browser connects here after
initiating a Stripe Checkout redirect to receive real-time plan upgrade
confirmation without polling.

**Auth:** Query-param token (one-time SSE token from `sse_token` route)  
**Protocol:** `text/event-stream`

**Event format:**
```
event: plan-updated
data: {"plan": "pro", "user_id": "..."}
```

**Flow:**
```
Client opens EventSource("/billing/events?token=...")
    ↓
Backend validates one-time token (Redis TTL 120s)
    ↓
Subscribe to PlanEventBus queue for user_id
    ↓
Wait up to 25 seconds for a Redis pub/sub message
    ↓
Yield SSE event → close connection
```

### `POST /billing/sse-token` — `routes/sse_token.py`

Generates a short-lived (120s) one-time Redis token that the frontend
exchanges for an SSE connection. Prevents auth token from being exposed
in URL query strings on EventSource connections (which cannot set headers).

---

## 2. Admin Routes — `admin.py`

Base path: `/api/v1/admin`  
**Auth:** All routes require `require_admin` dependency

### Overview

The admin panel exposes full CRUD over speaking/writing prompts, content
assets, calibration samples, and audit logs. All mutations are logged to
`AdminAuditLog`.

### Key Route Groups

#### Prompt Management — `admin_prompts.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/speaking/tasks` | GET | List all 8 task groups with prompt counts |
| `/admin/speaking/tasks/{task}/prompts` | GET | Paginated prompt list for a task |
| `/admin/speaking/prompts` | POST | Create new prompt (with optional image upload) |
| `/admin/speaking/prompts/{id}` | PUT | Update prompt text, timing, difficulty, exam_slot |
| `/admin/speaking/prompts/{id}` | DELETE | Soft-delete (sets `is_active=false`) |
| `/admin/writing/prompts` | GET/POST/PUT/DELETE | Same operations for writing prompts |

**Create Prompt — Input:**
```json
{
  "task_number": 3,
  "prompt_text": "Look at the image and describe what you see...",
  "prep_time_seconds": 30,
  "response_time_seconds": 60,
  "difficulty": "medium",
  "exam_slot": null,
  "is_active": true
}
```

#### Calibration Samples — `admin_prompts.py` (anchor endpoints)

| Endpoint | Description |
|----------|-------------|
| `GET /admin/speaking/prompts/{id}/anchors` | List Band-12 sample responses for a prompt |
| `POST /admin/speaking/prompts/{id}/anchors` | Add a new Band-12 anchor sample |
| `DELETE /admin/anchors/{anchor_id}` | Remove an anchor |

Anchor samples are stored in `sample_response_text` on the prompt row and
used by the AI calibration system to grade-anchor scoring.

#### Asset Management — `admin_assets.py`

| Endpoint | Description |
|----------|-------------|
| `POST /admin/assets/upload` | Upload image/audio to S3, get back public URL |
| `GET /admin/assets` | List all uploaded assets with metadata |
| `DELETE /admin/assets/{id}` | Delete asset from S3 + DB |

#### Tags — `admin_tags.py`

Full CRUD for content tags. Tags can be applied to prompts for filtering
in the admin UI.

#### Audit Log — `admin_audit.py`

`GET /admin/audit` — Paginated log of all admin actions with actor,
action type, target entity, and timestamp.

#### Cost Report — `admin_cost_report.py`

`GET /admin/costs` — Aggregated AI cost report by date, model, and operation
type (STT vs scoring). Backed by the `ai_cost_logs` table.

#### User Export — `users_export.py`

`GET /admin/users/export` — Triggers a background Celery job that dumps all
user data to a CSV file in S3 and emails the download link.

---

## 3. Health Routes — `health.py`

Base path: `/api/v1/health`

| Endpoint | Description |
|----------|-------------|
| `GET /health/live` | Liveness probe — returns `{"status": "ok"}` immediately |
| `GET /health/ready` | Readiness probe — checks DB connection and Redis ping |

Used by Docker/Kubernetes health checks. Returns `HTTP 503` if DB or Redis
is unreachable (signals the load balancer to stop routing traffic).
