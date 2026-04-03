# Phase 3 Implementation Plan

## CELPIP Exam Learning Platform

**Prepared as:** Senior software engineering implementation plan  
**Phase focus:** One-time payments, plan-scoped entitlements, add-on bundles, mock tests, progress intelligence, learning-material gating, and production hardening  
**Baseline assumption:** Phase 1 foundation is implemented and both backend and frontend are already running. Phase 2 AI scoring pipeline, reports, and history are implemented or near-complete enough to support this phase.

---

# 1. Executive Summary

Phase 3 should make the platform **commercially usable, operationally safe, and extensible** for a one-time purchase model.

The platform should **not** use recurring subscriptions as the primary monetization model. Instead, it should support:

- a **base plan purchase** made once
- optional **add-on bundles** that users can buy later
- **plan-scoped feature access**, so every add-on inherits the capability level of the user’s base plan
- strong backend entitlement enforcement
- premium product value through mock tests, progress tracking, learning materials, and AI-enabled reports

This means the commercialization model becomes:

1. user buys a base plan: `starter`, `pro`, or `ultra`
2. base plan unlocks a defined capability tier
3. user later buys add-ons such as:
   - extra attempts
   - extra mock tests
   - learning materials
   - practice material bundles
4. add-ons **increase quantity**, but they do **not upgrade capability level** beyond the user’s base plan

Examples:

- if a **Pro** user buys 10 more attempts, those attempts use **Pro-level functionality and feedback depth**
- if a **Starter** user buys extra attempts, those attempts stay limited to **Starter-level functionality**
- if an **Ultra** user buys add-ons, the add-ons operate with **Ultra-level functionality**

This should be treated as the core business rule for Phase 3.

---

# 2. Commercial Model to Implement

## 2.1 Canonical Plan Model

Use the following plan model everywhere:

- `starter`
- `pro`
- `ultra`

Older naming such as `free | premium | premium_plus` should be treated as legacy and should not appear in new billing, entitlement, or UI flows.

## 2.2 Commerce Model

The platform should implement **one-time plan purchase + optional add-on bundles**.

### Base plan purchase

A user purchases a base plan one time. That purchase grants:

- plan identity
- feature tier
- AI/reporting capability level
- default included quotas or credits
- access to a plan-specific learning and practice experience

### Add-on bundles

Users can buy extra units later, for example:

- extra attempts bundle
- extra mock-test bundle
- learning-material bundle
- practice-material bundle
- future premium support or deep-report bundle

Add-ons should be implemented as **consumable or unlockable products**, not subscriptions.

## 2.3 Core Rule: Add-ons Do Not Upgrade Plan Capability

This is the most important rule in the revised business model.

Add-ons should be governed by the user’s **effective plan tier**.

That means:

- **Starter + extra attempts** = more Starter attempts, not Pro-level reports
- **Starter + mock-test add-on** = Starter-level mock experience unless the product explicitly disallows Starter mocks
- **Pro + extra attempts** = more Pro attempts with Pro-level AI/report depth
- **Ultra + any add-on** = add-on executes with Ultra-level capabilities

So the system must separate:

- **capability tier** → derived from base plan
- **consumable quantity** → derived from included allowance + purchased bundles + used balance

This separation should drive the entire Phase 3 architecture.

---

# 3. Product Goal for Phase 3

## Main goal

Make the platform commercially ready using a **tiered base-plan model with one-time payments and add-on bundles**, while preserving the already built Phase 1 and Phase 2 core flows.

## Success criteria

Phase 3 is successful when:

- a user can buy Starter, Pro, or Ultra once
- a user can later buy add-on bundles without changing base-plan capability level
- the backend enforces feature access and usage limits correctly
- the frontend clearly shows what the user owns, what remains, and what is locked
- mock tests work end to end and consume the correct quota source
- progress and dashboard features become meaningful retention surfaces
- learning materials can be unlocked either by plan or by add-on
- admin/support tooling can inspect purchases, balances, and entitlement state safely

---

# 4. Revised Scope

## 4.1 In Scope

### A. One-time billing and purchase ledger

- Stripe Checkout for one-time purchases
- payment confirmation flow
- webhook handling and idempotent processing
- internal purchase ledger
- support for multiple product types:
  - base plans
  - consumable bundles
  - unlockable content bundles

### B. Entitlements and balances

- canonical entitlement service
- separation of capability tier vs consumable balances
- default included allowances from base plan
- add-on inventory and usage tracking
- backend enforcement for attempts and mock tests
- frontend visibility into remaining balances and locked features

### C. Billing UI

- billing/store page
- current base plan card
- owned add-ons section
- consumable balances summary
- purchase history list
- purchase CTA for bundles

### D. Mock tests

- speaking mock-test orchestration
- writing mock-test orchestration
- consumption from included or purchased mock-test credits
- aggregate report generation
- mock-test history entries

### E. Progress and dashboard upgrades

- progress page
- score trend summaries
- weak-area insights
- recommended next practice
- plan/balance widgets on dashboard

### F. Learning-material and practice-material gating

- plan-based gating
- add-on-based unlocks
- locked/unlocked content rendering
- material catalog model for future expansion

### G. Production hardening

- purchase event audit logs
- webhook observability
- rate limiting
- cleanup jobs
- support/admin purchase re-sync tools
- launch-readiness alerts and monitoring

---

# 5. Product Decisions to Lock Before Coding

## 5.1 Capability vs Quantity Model

The system must treat these as different concerns.

### Capability tier

Derived from the user’s base plan:

- Starter capability
- Pro capability
- Ultra capability

This controls:

- AI feature depth
- feedback depth
- reporting richness
- progress/analytics access
- learning content richness
- retry/review tooling

### Quantity balance

Derived from:

- included units from base plan
- purchased add-on bundles
- consumed usage

This controls how many times the user can use something.

This should be represented explicitly in data structures and code.

## 5.2 Recommended Base Plan Behavior

The exact numbers can still be tuned, but the architecture should support the following pattern.

### Starter

- basic feature tier
- limited AI feedback depth
- limited learning materials
- small included quota set
- no premium-only analytics unless separately unlocked

### Pro

- stronger AI/report capability
- richer task-level support and reports
- medium included quota set
- stronger learning-material coverage
- progress/history fully available

### Ultra

- highest AI/report capability
- best retry/review/drill experience
- largest included quota set
- richest learning-material access
- strongest progress and premium guidance features

## 5.3 Recommended Add-on Types

The architecture should support at least four add-on categories.

### Consumable bundles

Examples:

- 5 extra speaking attempts
- 10 extra speaking attempts
- 5 extra writing attempts
- 2 extra speaking mock tests
- 2 extra writing mock tests

### Unlock bundles

Examples:

- learning materials pack
- advanced practice materials pack
- premium template pack
- drill exercises pack

### Hybrid bundles

Examples:

- Pro practice booster = extra attempts + material unlock
- Writing mastery pack = writing attempts + writing materials

### Future add-ons

Examples:

- deep report pack
- human review add-on
- seasonal exam preparation pack

## 5.4 Recommended Usage Policy

### General rules

- usage should be checked at attempt creation or mock-test start time
- add-ons should be consumed only when the protected action is successfully reserved
- failed payment must not grant ownership
- failed AI jobs should follow a refund-or-recredit policy
- abandoned sessions should follow clearly documented balance rules

### Balance consumption order

Use a deterministic order:

1. consume included plan allowance first
2. then consume purchased add-on credits
3. preserve premium unlock flags separately

This keeps user messaging simple and avoids burning paid bundles before included quota.

## 5.5 Recommendation on Plan Changes

Because plans are one-time purchases, the product should clarify whether a user can:

- buy a higher plan later and replace the previous one
- hold multiple plan purchases historically but only one active capability tier
- receive upgrade pricing credit or not

Recommended implementation rule for Phase 3:

- user has **one active effective base plan**
- if they purchase a higher plan later, the higher plan becomes the active capability tier
- lower plan purchase history remains in the ledger for audit purposes
- downgrade is not a subscription concept anymore; instead, future purchases do not reduce already owned value

---

# 6. Delivery Strategy

The safest delivery approach is to split Phase 3 into four workstreams.

## Workstream A — Commerce and Purchase Ledger

Build the one-time payment pipeline, purchase recording, webhook handling, and product catalog mapping.

## Workstream B — Entitlements and Balance Engine

Build the capability-tier resolver, quantity balance calculator, and backend enforcement.

## Workstream C — Product Experience

Build billing/store UI, mock-test consumption behavior, progress widgets, and add-on-aware locked states.

## Workstream D — Hardening and Supportability

Build auditability, alerts, cleanup jobs, support tools, and edge-case recovery.

---

# 7. Suggested Timeline

## Week 1 — Commerce Foundation

### Goals

- Stripe one-time products and prices are created
- product catalog mapping exists in backend
- checkout flow works for one-time purchases
- webhook pipeline records purchases idempotently
- purchase history can be retrieved

### Deliverables

- product catalog table or config
- purchase ledger tables
- Stripe checkout service for one-time products
- webhook endpoint
- purchase summary endpoint
- current base plan UI shell

## Week 2 — Entitlements and Balances

### Goals

- capability tier is resolved correctly
- balances are computed correctly
- all attempt entry points enforce ownership and usage rules

### Deliverables

- centralized entitlement service
- balance summary endpoint
- attempt and mock-test gating
- structured quota/balance errors
- admin override tools

## Week 3 — Mock Tests and Store UX

### Goals

- mock tests consume correct balances
- store/billing page is usable end to end
- add-on purchases reflect correctly in UI

### Deliverables

- mock-test models and APIs
- mock-test balance consumption rules
- billing/store page
- purchase history list
- owned products and remaining balances widgets

## Week 4 — Progress, Learning Material Gating, Hardening

### Goals

- dashboard and progress become retention surfaces
- locked/unlocked content states are accurate
- platform is launch-ready operationally

### Deliverables

- progress page
- weak-area insights
- add-on and plan-aware learning material gating
- cleanup jobs
- alerts and monitoring
- launch checklist

---

# 8. Core Architecture Principle for Phase 3

The architecture must stop thinking in terms of only "subscription status" and move to an **ownership + entitlement + balance** model.

The system should answer these questions separately:

1. **What is the user’s active base plan?**
2. **What capabilities does that base plan allow?**
3. **What products has the user bought?**
4. **What balances remain for consumable items?**
5. **What unlockable content packs does the user own?**
6. **Which balance bucket should be consumed for this action?**

This should drive the backend domain model.

---

# 9. Backend Architecture Plan

## 9.1 Architectural Principles

Phase 3 backend changes should follow the same structure already established:

- routes handle HTTP contracts only
- services own business logic
- repositories own persistence and queries
- workers handle async and cleanup jobs
- entitlements are resolved centrally, never hardcoded in scattered routes

## 9.2 Proposed Backend File Additions

```text
apps/api/app/
├── api/v1/
│   ├── commerce.py
│   ├── purchases.py
│   ├── entitlements.py
│   ├── progress.py
│   └── mock_tests.py
├── models/
│   ├── product_catalog.py
│   ├── purchase_order.py
│   ├── purchase_item.py
│   ├── ownership_unlock.py
│   ├── usage_balance.py
│   ├── purchase_event.py
│   ├── mock_test.py
│   ├── mock_test_attempt_link.py
│   └── progress_snapshot.py
├── repositories/
│   ├── product_repo.py
│   ├── purchase_repo.py
│   ├── balance_repo.py
│   ├── entitlement_repo.py
│   ├── mock_test_repo.py
│   └── progress_repo.py
├── services/
│   ├── stripe_checkout_service.py
│   ├── commerce_service.py
│   ├── purchase_service.py
│   ├── entitlement_service.py
│   ├── balance_service.py
│   ├── mock_test_service.py
│   ├── progress_service.py
│   └── support_service.py
└── workers/
    ├── cleanup_tasks.py
    └── progress_tasks.py
```

## 9.3 Key Service Responsibilities

### `CommerceService`

- expose store catalog to frontend
- create checkout sessions for one-time products
- map Stripe prices to internal products

### `PurchaseService`

- record completed purchases
- create purchase ledger entries
- assign ownership unlocks or credit balances
- enforce idempotency on duplicate webhook events

### `EntitlementService`

- resolve active base plan
- resolve capability tier
- resolve owned unlocks
- answer “can user access this feature?”

### `BalanceService`

- calculate remaining attempt/mock balances
- reserve balance on action start
- release or refund balance on failure when policy allows

### `MockTestService`

- start mock tests after entitlement + balance check
- link attempts to mock-test session
- aggregate final mock report

---

# 10. Database and Schema Changes

## 10.1 Existing Tables to Reuse

Phase 3 should continue using existing core learning tables:

- `users`
- `attempts`
- `speaking_attempts`
- `writing_attempts`
- `score_reports`
- `score_dimensions`
- `feedback_reports`
- `calibration_samples`

The old `subscriptions` table should not remain the primary monetization table. It can either:

- be deprecated, or
- be repurposed only if it is generic enough to represent paid plan ownership history

Recommended approach: **do not overload `subscriptions` for one-time billing**. Introduce dedicated purchase/ownership tables instead.

## 10.2 New Table: `product_catalog`

Purpose:

- define every sellable product in the system
- support base plans, consumables, and unlockables

Suggested fields:

- `id`
- `product_code`
- `product_name`
- `product_type` (`base_plan`, `consumable_bundle`, `unlock_bundle`, `hybrid_bundle`)
- `plan_code` nullable (`starter`, `pro`, `ultra`) when relevant
- `skill_scope` nullable (`speaking`, `writing`, `both`)
- `bundle_quantity` nullable
- `feature_flags_json`
- `is_active`
- `stripe_price_id`
- `created_at`
- `updated_at`

## 10.3 New Table: `purchase_orders`

Purpose:

- represent a completed or attempted commercial transaction

Suggested fields:

- `id`
- `user_id`
- `provider` (`stripe`)
- `provider_checkout_session_id`
- `provider_payment_intent_id`
- `status` (`pending`, `paid`, `failed`, `refunded`, `partially_refunded`)
- `currency`
- `subtotal_amount`
- `tax_amount`
- `total_amount`
- `paid_at`
- `created_at`
- `updated_at`

## 10.4 New Table: `purchase_items`

Purpose:

- represent each product bought in an order

Suggested fields:

- `id`
- `purchase_order_id`
- `product_catalog_id`
- `quantity`
- `unit_amount`
- `total_amount`
- `metadata_json`
- `created_at`

## 10.5 New Table: `ownership_unlocks`

Purpose:

- represent non-consumable ownership such as:
  - active base plan
  - learning-material pack ownership
  - premium drill access

Suggested fields:

- `id`
- `user_id`
- `ownership_type` (`base_plan`, `learning_pack`, `practice_pack`, `feature_unlock`)
- `reference_code`
- `source_purchase_item_id`
- `is_active`
- `activated_at`
- `deactivated_at` nullable
- `metadata_json`
- `created_at`

## 10.6 New Table: `usage_balances`

Purpose:

- track remaining consumable units

Suggested fields:

- `id`
- `user_id`
- `balance_type` (`speaking_attempt`, `writing_attempt`, `speaking_mock`, `writing_mock`)
- `source_type` (`included_plan_allowance`, `addon_bundle`, `manual_grant`)
- `source_reference_id`
- `granted_units`
- `used_units`
- `remaining_units`
- `expires_at` nullable
- `metadata_json`
- `created_at`
- `updated_at`

## 10.7 New Table: `purchase_events`

Purpose:

- webhook idempotency
- audit trail
- replay/debug support

Suggested fields:

- `id`
- `provider_event_id`
- `provider`
- `event_type`
- `payload_json`
- `processing_status`
- `processed_at`
- `created_at`

## 10.8 New Table: `mock_tests`

Purpose:

- represent a section-level mock-test session

Suggested fields:

- `id`
- `user_id`
- `skill`
- `status`
- `consumed_balance_id`
- `started_at`
- `submitted_at`
- `completed_at`
- `total_estimated_band`
- `result_summary_json`

## 10.9 New Table: `mock_test_attempt_links`

Purpose:

- map mock tests to underlying attempts

Suggested fields:

- `id`
- `mock_test_id`
- `attempt_id`
- `task_number`
- `section_order`
- `created_at`

## 10.10 New Table: `progress_snapshots`

Purpose:

- cache progress metrics for dashboard and progress page

Suggested fields:

- `id`
- `user_id`
- `skill`
- `current_estimated_band`
- `rolling_average_band`
- `best_band`
- `weakest_dimensions_json`
- `task_breakdown_json`
- `recommended_next_task`
- `snapshot_date`
- `created_at`

---

# 11. Entitlement and Balance Engine

## 11.1 Why a Dedicated Entitlement Service Is Mandatory

In the new business model, access is no longer a simple yes/no plan check.

The system must resolve:

- active capability tier
- owned unlocks
- remaining balances
- balance source priority
- plan-scoped feature behavior

That requires a single source of truth.

## 11.2 Recommended Core Interface

```python
class EntitlementService:
    async def get_active_base_plan(self, user_id): ...
    async def get_capability_tier(self, user_id): ...
    async def get_owned_unlocks(self, user_id): ...
    async def get_balance_summary(self, user_id): ...
    async def can_start_attempt(self, user_id, skill, task_number): ...
    async def can_start_mock_test(self, user_id, skill): ...
    async def can_access_learning_material(self, user_id, material_code): ...
```

## 11.3 Balance Resolution Rules

Recommended rules:

- included balances from base plan are granted on first plan activation
- purchased add-on balances are appended as separate balance buckets
- system consumes included balance first
- then consumes purchased add-on balance
- unlock bundles are checked separately from balance buckets

## 11.4 Structured Decision Output

Every protected action should return a structured decision, for example:

```json
{
  "allowed": false,
  "reason_code": "NO_BALANCE_REMAINING",
  "capability_tier": "starter",
  "required_balance_type": "speaking_attempt",
  "remaining_units": 0,
  "purchase_cta": "/billing"
}
```

## 11.5 Plan-Scoped Feature Rules

Examples:

### Starter

- AI feedback depth limited
- sample responses may be shorter or less detailed
- some advanced progress insights hidden
- advanced material packs may remain locked unless separately owned

### Pro

- full standard reports
- richer explanations
- better retry/review support
- wider material access

### Ultra

- deepest report level
- strongest guidance features
- richest drill and support surfaces

The engine must never infer feature level from add-on type alone.
It must always derive feature level from the user’s active base plan.

---

# 12. Stripe Integration Plan for One-Time Purchases

## 12.1 Recommended Stripe Features

Use hosted Stripe flows for one-time checkout.

Recommended:

- Checkout Session for one-time products
- webhook-driven purchase confirmation
- optional customer portal only if needed for invoice history or receipts, not subscription management

## 12.2 Webhook Events to Support

At minimum:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

If Stripe tax or other features are enabled, include the related events you rely on operationally.

## 12.3 Webhook Processing Rules

Each webhook handler must:

1. verify signature
2. persist raw event in `purchase_events`
3. reject duplicates using provider event ID
4. locate internal product mapping
5. create or update `purchase_orders`
6. create `purchase_items`
7. grant ownership unlocks or balances
8. log processing result

## 12.4 Product Mapping

Maintain a strict mapping from Stripe price IDs to internal catalog products.

Example:

```python
STRIPE_PRICE_TO_PRODUCT = {
    "price_starter_plan": "starter_base_plan",
    "price_pro_plan": "pro_base_plan",
    "price_ultra_plan": "ultra_base_plan",
    "price_speaking_attempt_pack_10": "speaking_attempt_bundle_10",
    "price_writing_mock_pack_2": "writing_mock_bundle_2",
    "price_learning_pack_core": "learning_pack_core",
}
```

## 12.5 we dont have refund policy, whatever is purchased stays as it is. No-refund will be provided

---

# 13. API Design

## 13.1 Commerce APIs

### `GET /api/v1/commerce/catalog`

Returns store catalog:

- base plans
- consumable bundles
- unlock bundles
- pricing metadata
- active/inactive state

### `POST /api/v1/commerce/checkout-session`

Input:

- `product_code`
- optional quantity if allowed

Returns:

- Stripe checkout URL or session ID

### `GET /api/v1/commerce/summary`

Returns:

- active base plan
- owned unlocks
- consumable balances
- recent purchase history

### `POST /api/v1/commerce/webhooks/stripe`

Purpose:

- process Stripe purchase events idempotently

## 13.2 Entitlement APIs

### `GET /api/v1/entitlements/me`

Returns:

- active base plan
- capability tier
- feature flags
- owned unlocks

### `GET /api/v1/balances/me`

Returns:

- remaining speaking attempts
- remaining writing attempts
- remaining speaking mock tests
- remaining writing mock tests
- balance bucket breakdown if needed for support/debugging

## 13.3 Progress APIs

### `GET /api/v1/progress/summary`

Returns:

- current band estimate
- recent trend
- weak areas
- recommended next practice

### `GET /api/v1/progress/trends`

Returns:

- time-series band estimates by skill
- rolling averages
- task-level slices

## 13.4 Mock-Test APIs

### `POST /api/v1/mock-tests/start`

Creates a mock-test session after entitlement + balance check.

### `GET /api/v1/mock-tests/{id}`

Returns session state.

### `POST /api/v1/mock-tests/{id}/submit`

Submits final session state and triggers aggregation if needed.

### `GET /api/v1/mock-tests/{id}/report`

Returns aggregate mock report.

---

# 14. Mock-Test Architecture

## 14.1 Reuse Existing Attempt Infrastructure

Mock tests should remain a session orchestration layer over the existing attempt/report pipeline.

That means:

- each task in a mock test still produces normal attempt records
- mock-test session coordinates sequence and strict flow
- aggregate report is built on top of existing individual reports

## 14.2 Balance Consumption for Mock Tests

Mock tests should consume from one of two sources:

- included mock-test allowance granted by base plan
- purchased mock-test bundle credits

This should happen at session reservation/start, not only at report generation.

## 14.3 Plan-Scoped Mock-Test Experience

Mock tests should still behave differently by capability tier where product requires it.

Examples:

- Starter mock test may have lighter report depth
- Pro mock test gives full report set
- Ultra mock test may expose deeper summaries or richer sample content

Again, add-ons provide quantity, not tier upgrade.

---

# 15. Progress and Dashboard Enhancements

## 15.1 Objective

The dashboard should become both:

- a retention surface
- a balance-awareness surface

## 15.2 New Dashboard Widgets

Add or improve:

- active base plan card
- remaining attempts widget
- remaining mock-test widget
- owned material packs widget
- recent attempts widget
- weak areas widget
- recommended next practice widget
- progress trend sparkline

## 15.3 Progress Metrics to Compute

Recommended core metrics:

- current estimated band by skill
- rolling average over recent attempts
- best band by skill
- task-level score averages
- weakest 2 or 3 dimensions
- recent improvement direction
- next recommended task
- streak days

## 15.4 Progress Computation Strategy

Use a hybrid approach:

- lightweight recompute after every completed attempt
- nightly refresh jobs for full snapshots
- cache in `progress_snapshots`

---

# 16. Learning Material and Practice Material Gating

## 16.1 Goal

Learning material access should support both:

- plan-based default access
- add-on-based unlock access

## 16.2 Access Resolution Pattern

A material should be accessible if either:

1. the active base plan includes it, or
2. the user owns the add-on that unlocks it

## 16.3 Recommended Material Tiers

### Starter default

- limited templates
- basic tips
- selected examples

### Pro default

- full task tips
- richer examples
- stronger writing guidance
- expanded prompt support cards

### Ultra default

- full Pro content
- drill frameworks
- deeper structured review guidance

### Add-on unlocks

- learning materials pack
- advanced practice materials pack
- speaking drills pack
- writing mastery pack

## 16.4 Implementation Pattern

Do not hardcode content access logic in UI components.
Instead:

- store material metadata with required unlock rules
- backend resolves access status
- frontend renders unlocked, preview, or locked state

---

# 17. Frontend Implementation Plan

## 17.1 New Pages

```text
apps/web/app/
├── billing/page.tsx
├── progress/page.tsx
├── mock-tests/page.tsx
├── mock-tests/[id]/page.tsx
└── mock-tests/[id]/report/page.tsx
```

## 17.2 New Components

```text
apps/web/components/
├── billing/
│   ├── StorePage.tsx
│   ├── BasePlanCard.tsx
│   ├── AddonCard.tsx
│   ├── OwnedProductsCard.tsx
│   ├── BalanceSummaryCard.tsx
│   ├── PurchaseHistoryTable.tsx
│   └── LockedFeatureBanner.tsx
├── progress/
│   ├── ProgressPage.tsx
│   ├── TrendChartCard.tsx
│   ├── WeakAreasCard.tsx
│   ├── TaskBreakdownGrid.tsx
│   └── RecommendedNextPracticeCard.tsx
├── mock_tests/
│   ├── MockTestLanding.tsx
│   ├── MockTestSessionShell.tsx
│   ├── MockTestGuard.tsx
│   ├── MockTestProgressBar.tsx
│   ├── MockTestSummaryCard.tsx
│   └── MockTestReportPage.tsx
└── common/
    ├── BalanceBadge.tsx
    ├── LockedFeatureCard.tsx
    ├── PurchasePromptModal.tsx
    └── OwnershipChip.tsx
```

## 17.3 Frontend Data Hooks

Add:

- `useCommerceCatalog()`
- `useCommerceSummary()`
- `useEntitlements()`
- `useBalances()`
- `useProgressSummary()`
- `useMockTest()`
- `useMockTestHistory()`
- `useMockTestReport()`

## 17.4 UX Rules

- a single billing/store page should explain plan vs add-on clearly
- user must always see what they own and what remains
- purchase prompts should explain whether the limitation is **feature tier** or **balance depletion**
- locked content must explain whether user needs:
  - a higher plan, or
  - a specific add-on pack
- mock-test entry page should show exactly how many mock credits remain

---

# 18. Worker and Background Job Plan

## 18.1 New Background Jobs

### `progress_tasks.py`

Responsibilities:

- recompute snapshots after completed attempts
- nightly refresh of user summaries

### `cleanup_tasks.py`

Responsibilities:

- archive or delete expired audio assets according to retention policy
- clean stale temporary uploads
- clean stale unpaid purchase attempts if recorded internally
- remove abandoned temporary mock sessions according to business rules

### Optional `reconciliation_tasks.py`

Responsibilities:

- verify paid Stripe events against local purchase ledger
- surface mismatches for support review

## 18.2 Job Scheduling

Recommended recurring jobs:

- nightly progress recompute
- daily cleanup of temp uploads and stale records
- daily purchase-event reconciliation scan
- periodic failed-webhook alert scan

---

# 19. Security, Compliance, and Abuse Prevention

## 19.1 Required Controls

- webhook signature verification
- signed upload URLs or authenticated upload endpoints
- strict backend entitlement and balance enforcement
- rate limiting on checkout creation and attempt-start endpoints
- no provider secrets in frontend
- role-protected admin/support pages

## 19.2 Data Handling

Define retention policies for:

- raw audio uploads
- transcripts
- reports
- purchase event payloads
- payment-related identifiers

## 19.3 Abuse Cases to Consider

- repeated attempt-start spam to exhaust balances incorrectly
- repeated checkout creation abuse
- webhook replay attempts
- race-condition double reservation of balances
- bot-driven starter-plan abuse
- fraudulent refund attempts after content consumption

Mitigations:

- rate limiting
- idempotency keys
- transaction-safe balance reservation
- structured audit logs
- support-visible purchase and usage history

---

# 20. Observability and Support Readiness

## 20.1 Metrics to Track

- checkout session creation count
- paid purchase conversion rate
- payment failure rate
- webhook processing success/failure count
- balance reservation failures
- no-balance error count
- mock-test start vs completion rate
- report generation time
- progress snapshot job failures

## 20.2 Logging Requirements

Structured logs should include:

- user ID
- attempt ID or mock-test ID
- purchase order ID
- purchase event ID
- product code
- capability tier before and after update
- balance change details
- decision outcome for protected actions

## 20.3 Admin/Support Views

Add a lightweight support surface showing:

- active base plan
- owned unlocks
- remaining balances
- recent purchase history
- last successful Stripe event
- recent balance consumption actions
- ability to safely re-sync a purchase
- manual grant tool for support-only balance adjustments

---

# 21. Testing Strategy

## 21.1 Unit Tests

Cover:

- capability-tier resolution
- product mapping from Stripe price IDs
- ownership unlock granting
- balance calculation and consumption order
- mock-test aggregation logic
- progress summary calculations

## 21.2 Integration Tests

Cover:

- webhook event processing
- paid purchase creating correct ownership or balances
- attempt creation enforcing entitlement and balance rules
- mock-test start and completion
- commerce summary endpoint

## 21.3 End-to-End Tests

Cover:

- Starter user buying extra attempts and using Starter-level functionality only
- Pro user buying extra attempts and receiving Pro-level report behavior
- user buying learning materials pack and seeing content unlocked without plan upgrade
- user exhausting included balance and then consuming add-on balance
- user running a mock test and viewing aggregate report

## 21.4 Regression Testing

Before release, verify Phase 1 and Phase 2 flows still work:

- speaking individual practice
- writing individual practice
- async scoring pipeline
- status polling
- report viewing
- history page

---

# 22. Risks and Mitigations

## Risk 1 — Capability tier and add-on quantity get mixed up

### Impact

Users may receive the wrong level of functionality.

### Mitigation

- model capability tier separately from balances
- central entitlement service
- strong integration tests around Starter/Pro/Ultra behavior with add-ons

## Risk 2 — Balance reservation bugs cause credit loss or double spending

### Impact

User trust drops quickly.

### Mitigation

- transactional balance reservation
- idempotent action start logic
- support-visible audit history
- automated tests for race conditions

## Risk 3 — Store UX confuses users about plan vs add-on value

### Impact

Conversion drops and support tickets increase.

### Mitigation

- explain clearly that plan controls feature depth
- explain clearly that add-ons increase quantity or unlock content
- show owned status and remaining balances prominently

## Risk 4 — Operational blind spots at launch

### Impact

Slow incident response.

### Mitigation

- alerts
- purchase reconciliation tooling
- structured logs
- support diagnostics
- cleanup and reconciliation jobs

---

# 23. Recommended Implementation Order

## Step 1

Finalize business rules for:

- base plan ownership behavior
- upgrade behavior when buying a higher one-time plan later
- included quotas per plan
- add-on catalog
- refund and recredit policy

## Step 2

Implement product catalog, purchase ledger, and Stripe one-time checkout flow.

## Step 3

Implement webhook processing and ownership/balance granting.

## Step 4

Implement centralized entitlement and balance engine.

## Step 5

Apply enforcement to all protected actions: attempts, mock tests, and locked materials.

## Step 6

Build billing/store UI, purchase history, and owned-product summary.

## Step 7

Build mock-test balance consumption and aggregate report flows.

## Step 8

Build progress snapshot pipeline and progress page.

## Step 9

Add learning-material unlock logic and add-on-aware locked states.

## Step 10

Add support tools, reconciliation jobs, rate limiting, alerts, and launch QA.

---

# 24. Definition of Done

Phase 3 is complete when all of the following are true:

- users can purchase Starter, Pro, and Ultra as one-time products
- users can purchase add-on bundles after plan purchase
- base plan capability tier is enforced independently from add-on quantity
- balances are granted, consumed, and displayed correctly
- mock tests consume the correct balance source and generate reports correctly
- learning materials and practice materials unlock correctly by plan or add-on
- progress page shows meaningful, tested summaries
- purchase ledger, audit logs, support tools, and alerts are operational
- core Phase 1 and Phase 2 flows remain stable

---

# 25. Final Recommendation

Phase 3 should be treated as the **commercialization and launch-readiness phase for a one-time purchase product**.

The most important architectural decision is this:

> **Base plan controls capability. Add-ons control quantity or unlock ownership.**

If that rule is built cleanly into the backend domain model, the rest of the product becomes much easier to scale.

The right engineering sequence is:

1. product catalog and purchase ledger
2. entitlement and balance engine
3. billing/store UX
4. mock-test consumption and aggregation
5. progress and material gating
6. hardening and launch readiness

That sequence gives the best balance of business value, implementation clarity, and operational safety.
