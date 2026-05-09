# CELPIP PRO — Billing Components

**Author:** Senior Web Developer  
**Location:** `apps/web/components/billing/`  
**Route:** `app/(main)/billing/page.tsx`

---

## Architecture Overview

The billing page uses a **two-column desktop layout**:

- **Left column** — Page header · `CurrentPlanBanner` · `PlanGrid` (Free + Pro) · `AddonGrid` · `BillingFAQ` · Legal footnote
- **Right column** — `BillingCartPanel` (sticky, `lg:sticky lg:top-8`)

Cart state is managed by `useBillingCartStore` (Zustand, pure actions only).  
Plan upgrade checkout flows through `useBilling.startCheckout`.  
Cart checkout (add-ons) flows through `useCreateCheckoutSession`.

---

## 1. `BillingPageClient.tsx` — Client-Side Orchestrator

**Type:** `"use client"`  
**Props from server:** `success: boolean`, `canceled: boolean`, `planParam?: string`  
**Hooks:** `useCurrentUser()`, `useBilling()`, `useBillingCartStore`

### Purpose
Central orchestrator for the `/billing` page. Wires together the current user plan, billing status, plan upgrade, cart add-on management, and all sub-components.

### Real-Time Plan Update Architecture
```
Stripe webhook → backend commits plan → Redis PUBLISH →
SSE stream (usePlanEvents) → React Query invalidation →
useCurrentUser() re-fetches → PlanBadge in Navbar updates
```

### Checkout Flows

**Plan upgrade:**
```typescript
handleUpgrade(plan: BillingPlan)
    → setCheckingOutPlan(plan)       // spinner on that card only
    → startCheckout(plan, { onError })
        → POST /api/v1/billing/checkout → Stripe redirect
```

**Cart checkout:**
```typescript
// In BillingCartPanel
createCheckoutSession({ items, promo_code }, { onError })
    → POST /api/v1/billing/checkout (cart payload)
    → window.location.href = checkout_url
```

**Add-on add to cart:**
```typescript
handleAddToCart(item)
    → addItem(item)          // billingCartStore
    → toast.success(...)
```

### Page Layout (left column, top → bottom)
1. `SuccessHandler` — null-render, handles `?success` / `?canceled`
2. Page header — "Billing & Store"
3. `CurrentPlanBanner` — current plan + portal link
4. "Choose Your Plan" heading
5. `PlanGrid` — 2 plan cards (Free, Pro)
6. `AddonGrid` — 3 add-on cards
7. `BillingFAQ` — collapsible FAQ
8. Legal footnote

---

## 2. `PlanGrid.tsx` — Plan Card Container

**Type:** `"use client"`  
**Plans:** Free (Starter) + Pro only. Ultra plan has been removed.

### Layout
`grid-cols-1 md:grid-cols-2` — two equal columns on desktop.

### Props
`currentPlan: string`, `checkingOutPlan: BillingPlan | null`, `onUpgrade`

---

## 3. `PlanCard.tsx` — Individual Plan Card

**Type:** `"use client"` — has `onUpgrade` callback  
**Used by:** `PlanGrid`

### CTA State Machine

| Condition | CTA Rendered |
|-----------|-------------|
| `isCurrent` | Disabled success `"Active Plan"` div |
| `isStarter` | `"Always Free"` (no action) |
| `canUpgrade` | **Active button** → `onUpgrade(plan.id)` + spinner when `isCheckingOut` |
| Otherwise | `"Not available"` muted div |

### Key IDs
- `#billing-plan-{id}` — card wrapper
- `#billing-upgrade-{id}` — upgrade button

---

## 4. `CurrentPlanBanner.tsx` — Active Plan Status Banner

**Type:** `"use client"`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `plan` | `"starter" \| "pro"` | Current plan |
| `billingStatus` | `BillingStatus \| null` | From Stripe — has `has_active_purchase` |
| `onOpenPortal` | `() => void` | Opens Stripe customer portal |
| `isOpeningPortal` | `boolean` | Loading state for portal button |

### Action Buttons
- `plan === "starter"` → **"Upgrade to Pro →"** primary button → `#plans`
- `hasPurchase` → **"View Receipts"** outlined button → Stripe portal

**ID:** `#billing-portal-btn`

---

## 5. `AddonGrid.tsx` — Practice Add-on Grid

**Type:** `"use client"`

### Purpose
Renders three `AddonCard` components in a 3-column responsive grid.
Add-ons are visible to all users but disabled (with "Requires Pro" CTA) for Starter users.

### Props
`currentPlan: UserPlan`, `onAddToCart: (item: Omit<CartItem, "quantity">) => void`

### Add-ons configured
| id | Name | Price | Qty |
|----|------|-------|-----|
| `writing-pack` | Writing Pack | $3.99 CAD | 5 questions |
| `speaking-pack` | Speaking Pack | $6.99 CAD | 5 questions |
| `custom-bundle` | Custom Task Bundle | $1.99 CAD | 5 questions (one task) |

---

## 6. `AddonCard.tsx` — Single Add-on Card (Grid layout)

**Props:** `{ config: AddonCardConfig, onAddToCart }`

- `config.taskOptions` — simple task selector (Writing/Speaking packs) — renders `BillingSelect`
- `config.moduleTaskOptions` — two-level selector (Custom Bundle) — module tab row + `BillingSelect`
- `config.disabled` — greys out card; CTA shows "Requires Pro"

> **Note:** All users (Starter and Pro) can purchase add-ons. Starter users receive extra question attempts without Pro-tier AI report features.

### Key IDs
- `billing-addon-{id}-add` — Add to cart button
- `billing-custom-module-{module}` — Speaking/Writing module tab

---

## 6a. `AddonRow.tsx` — Single Add-on Card (Compact row layout)

**Used by:** `BillingPageClient` (3rd column in the 3-column desktop grid)

Identical logic to `AddonCard` but uses a tighter `p-4` layout with `text-xs` typography. Shares `AddonCardConfig` type. Uses `BillingSelect` for the Custom Bundle task dropdown.

---

## 6b. `BillingSelect.tsx` — Custom Dropdown Component

**Type:** `"use client"`  
**Location:** `components/billing/BillingSelect.tsx`

### Purpose
Replaces all native `<select>` elements in the billing flow. Native `<option>` elements cannot be reliably styled dark across browsers (especially Safari), making this necessary for a production dark-theme app.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Currently selected option key |
| `onChange` | `(key: string) => void` | — | Called on selection |
| `options` | `SelectOption[]` | — | `{ key: string; label: string }[]` |
| `disabled` | `boolean` | `false` | Blocks interaction, applies opacity-40 |
| `className` | `string` | — | Extra classes on the wrapper div |
| `placeholder` | `string` | `"Select…"` | Shown when no value matches |

### Features

| Feature | Implementation |
|---------|---------------|
| Dark theme | `bg-[#111318]` panel, guaranteed cross-browser |
| Keyboard nav | `ArrowUp/Down` move focus · `Enter/Space` selects · `Escape` closes · `Tab` closes |
| Outside-click close | `mousedown` on `document`, cleaned up on unmount |
| Auto-scroll | Focused option scrolled into view via `scrollIntoView({ block: 'nearest' })` |
| Opens upward | Detects `< 220px` below trigger, flips to `bottom-full mb-1` |
| ARIA | `role="listbox"`, `role="option"`, `aria-selected`, `aria-expanded`, `aria-controls` |
| Selected indicator | Amber `Check` icon + `text-amber-400` on selected item |
| Custom scrollbar | `1.5px` webkit scrollbar, transparent track |

### Usage
```tsx
import { BillingSelect } from "./BillingSelect";

<BillingSelect
  value={selectedTask}
  onChange={setSelectedTask}
  options={taskKeys.map((key) => ({ key, label: taskOptions[key] }))}
  disabled={disabled}
/>
```

---

## 7. `BillingCartPanel.tsx` — Sticky Cart Panel

**Type:** `"use client"` — reads from `useBillingCartStore`

### Sections (top → bottom)
1. Cart header + item count badge
2. `BillingCartItem` list — or empty state
3. `PromoCodeForm`
4. Subtotal / Tax (13% HST) / Total breakdown
5. Checkout button (`id="billing-checkout-button"`)
6. "Stripe-powered" copy
7. `BillingTrustStrip`

### Empty State
Shown when `items.length === 0`. Checkout button is disabled. Copy:
> Your cart is empty. Choose a plan or add a practice pack to continue.

---

## 8. `BillingCartItem.tsx` — Cart Row

**Type:** `"use client"`

### Layout
`[type indicator dot] [name + subtitle] [QuantityStepper] [line total] [remove ×]`

### Key IDs
- `billing-cart-item-{id}-increase`
- `billing-cart-item-{id}-decrease`
- `billing-cart-item-{id}-remove`

---

## 9. `QuantityStepper.tsx` — Qty Control

**Props:** `{ id, value, onIncrease, onDecrease, min?, max? }`

Renders `−` / qty value / `+` buttons. Uses `border-border`, `hover:bg-muted`, accessible `aria-label`.

---

## 10. `PromoCodeForm.tsx` — Promo Code Input

**Type:** `"use client"` — uses `useApplyPromoCode` + `useBillingCartStore`

### States
- **Input state** — text input + Apply button with loading spinner
- **Applied state** — success badge showing code + discount amount, with remove `×`

### Key IDs
- `billing-promo-input`
- `billing-promo-apply`

---

## 11. `BillingTrustStrip.tsx` — Trust Notes

Three compact icon+label trust items rendered below the checkout button inside the cart drawer and panel.

---

## 12a. `BillingCartDrawer.tsx` — Slide-in Cart Drawer

**Type:** `"use client"`  
**Context:** `BillingCartDrawerProvider` (wraps `BillingPageClient`)

### Purpose
Slide-in `<aside>` from the right edge. Contains the full `BillingCartPanel` in embedded mode. Controlled via `useBillingCartDrawer()` context.

### Layout
- Fixed `top-0 right-0`, `w-[400px]` on `sm+`, full width on mobile
- `bg-[#0D0F17]` — hardcoded dark (not `bg-background`) to guarantee dark rendering
- `font-light tracking-wide` — distinct typographic style from page body
- Header: small-caps `YOUR CART` label + close `×` button
- Body: scrollable `BillingCartPanel embedded`
- Animation: `translate-x-0` ↔ `translate-x-full` via CSS transition

### Context API
```typescript
const { isOpen, open, close } = useBillingCartDrawer();
```

---

## 12b. `CartFAB.tsx` — Floating Cart Button

**Type:** `"use client"`  
**Position:** `fixed top-[72px] right-6 z-30` (below sticky navbar)

### Behaviour
- Hidden when `isOpen` (drawer already open) via `opacity-0 pointer-events-none scale-90`
- **Only renders** when `totalQty > 0` — hides when cart is empty to avoid distraction
- Cart icon shows a dot badge with item count
- Label: `"View Cart"`

**ID:** `#billing-cart-fab`

---

## 12. `SuccessHandler.tsx` — Post-Checkout Side Effects (null render)

Handles `?success=true` / `?canceled=true` URL params on mount. No UI emitted.

### Success Flow
```
1. refreshAfterPayment()         → invalidates billing + user caches
2. toast.success("Welcome to Pro!")   → 6s duration
3. router.replace("/billing")    → removes ?success from URL
```

### SSE Fallback Polling
For corporate proxies that block SSE — polls every 5s (max 3 polls) if `user.plan` hasn't updated after success redirect.

---

## 13. `BillingFAQ.tsx` — FAQ Accordion

Collapsible accordion covering common billing questions.

---

## Billing Data Flow

```
GET /api/v1/users/me
    → user.plan ("starter" | "pro")

GET /api/v1/billing/status
    → { has_active_purchase: boolean, stripe_plan: string, ... }

POST /api/v1/billing/checkout
    → Single plan:    { plan: "pro" } → { checkout_url }
    → Cart payload:   { items: CartItem[], promo_code: string | null } → { checkout_url }

GET /api/v1/billing/portal
    → { portal_url: string }

POST /api/v1/billing/promo/validate
    → { code: string } → { valid, discount_amount, code, message? }
```

---

## Cart Store (`billingCartStore.ts`)

**Location:** `apps/web/store/billingCartStore.ts`

### State Shape
```typescript
interface BillingCartState {
  items:          CartItem[];
  promoCode:      string | null;
  promoDiscount:  number;
}
```

### CartItem Shape
```typescript
interface CartItem {
  id:        string;          // unique cart key
  type:      CartItemType;    // "plan" | "writing_pack" | "speaking_pack" | "custom_bundle"
  name:      string;
  subtitle:  string;
  unitPrice: number;
  currency:  "CAD";
  quantity:  number;
  metadata:  Record<string, string>;  // taskKey, priceId, etc.
}
```

### Actions
- `addItem(item)` — add or increase qty if id exists
- `increaseQty(id)` / `decreaseQty(id)` — auto-remove at qty 0
- `removeItem(id)`
- `clearCart()`
- `applyPromo(code, discount)` / `clearPromo()`

### Selectors (exported pure functions)
- `selectSubtotal(items)` — sum of `unitPrice × quantity`
- `selectTax(subtotal)` — 13% HST
- `selectTotal(subtotal, discount)` — `(subtotal - discount) + tax`
- `formatCAD(amount)` — formats to "X.XX" string

---

## Hooks

| Hook | Description |
|------|-------------|
| `useBilling` | Billing status query + startCheckout + openPortal |
| `useCreateCheckoutSession` | Cart-aware Stripe checkout mutation |
| `useApplyPromoCode` | Promo code validation mutation |

---

## Plan Pricing (as of May 2026)

| Plan | Price | Model |
|------|-------|-------|
| Starter | Free | Always free |
| Pro | $9.99 CAD/month | Monthly subscription |

Add-ons are one-time purchases available to Pro subscribers.

---

## Design System (Billing-specific tokens)

| Token | Value |
|-------|-------|
| Canvas | `bg-[#0D0F17]` (hardcoded — not CSS var) |
| Card border | `border-white/[0.10]` hover → `border-white/[0.16]` |
| Pro plan glow | `shadow-[0_0_30px_rgba(245,158,11,0.07)]` |
| Primary accent | `amber-500` / `amber-400` (replaced legacy indigo) |
| Text primary | `text-white/90` |
| Text secondary | `text-white/40–55` |
| Text muted | `text-white/25–30` |
| CTA button | `bg-amber-500 hover:bg-amber-400 text-black` |
| Add-to-cart button | `border-amber-500/40 text-amber-400` |
| Drawer background | `bg-[#0D0F17]` — explicit, not `bg-background` |
| Dropdown panel | `bg-[#111318] border-white/[0.10]` |

---

## Test Automation IDs

| ID | Element |
|----|---------|
| `billing-plan-{id}` | Plan card wrapper |
| `billing-upgrade-{id}` | Plan upgrade button |
| `billing-addon-{id}-add` | Add-on "Add to cart" button |
| `billing-custom-module-speaking` | Custom Bundle Speaking tab |
| `billing-custom-module-writing` | Custom Bundle Writing tab |
| `billing-select-trigger-{useId}` | BillingSelect trigger button |
| `billing-select-list-{useId}` | BillingSelect dropdown listbox |
| `billing-cart-fab` | Floating cart button |
| `billing-cart-item-{id}-increase` | Cart item increase qty |
| `billing-cart-item-{id}-decrease` | Cart item decrease qty |
| `billing-cart-item-{id}-remove` | Cart item remove |
| `billing-promo-input` | Promo code input |
| `billing-promo-apply` | Promo code apply button |
| `billing-checkout-button` | Main checkout CTA |
| `billing-portal-btn` | Stripe customer portal button |

---

*Last updated: May 2026. Reflects billing page redesign + BillingSelect introduction.*
