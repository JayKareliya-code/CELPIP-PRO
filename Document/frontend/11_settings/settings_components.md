# CELPIP PRO — Settings Components

**Author:** Senior Web Developer  
**Location:** `apps/web/components/settings/`  
**Route:** `app/(main)/settings/page.tsx`

---

## Architecture Overview

Settings uses a **left sidebar + content panel** layout (desktop) or
**horizontal pill nav + content** layout (mobile).

```
SettingsNav          (left sidebar / top pill row)
    ↓ active tab
page.tsx client shell
    → ProfileTab      (default)
    → GoalTab
    → SubscriptionTab
    → PrivacyTab
    → DangerTab
```

All tabs are rendered in a `switch(activeTab)` — not hidden with CSS. Each
tab mounts fresh when selected.

---

## 1. `SettingsNav.tsx` — Tab Navigation Sidebar

**Type:** `"use client"` — reads `active` prop, fires `onChange`

### Purpose
Stateless nav component. Renders all settings tab buttons from the
`SETTINGS_TABS` constant. Adapts between a vertical sidebar (desktop)
and a horizontally-scrollable pill row (mobile).

### Props
`active: SettingsTab`, `onChange: (tab: SettingsTab) => void`

### Layout
- Desktop (`lg+`): vertical `flex-col`, `w-52` fixed width
- Mobile: horizontal `flex-row overflow-x-auto no-scrollbar`

### Tab Styling

| State | Default | Danger tab |
|-------|---------|-----------|
| Active | `bg-amber-500/10 border-amber-500/20 text-amber-400` | `bg-red-500/10 border-red-500/20 text-red-400` |
| Inactive | `text-white/40 hover:text-white/80` | `text-white/40 hover:text-red-400/80` |

Labels are hidden at `xs` breakpoint (icon-only) — visible from `sm+`.

### `SETTINGS_TABS` constant (from `types.ts`)

| ID | Label | Icon |
|----|-------|------|
| `profile` | Profile | `User` |
| `goal` | Band Goal | `Target` |
| `subscription` | Subscription | `CreditCard` |
| `privacy` | Privacy | `Shield` |
| `danger` | Danger Zone | `AlertTriangle` |

**IDs:** Each button has `id="settings-tab-{id}"` for test automation.

---

## 2. `tabs/ProfileTab.tsx` — Account Overview

**Type:** `"use client"`  
**Data sources:** `useUser()` + `useClerk()` (Clerk) + `useCurrentUser()` (platform API)

### Purpose
Read-only account summary: identity, plan badge, streak, target band, and
a CTA to open the Clerk managed-account modal.

### Sections

#### Identity Row
- **Avatar:** Clerk `imageUrl` → `<img>` | fallback: `displayName[0]` initial circle
- **Name:** `clerkUser.fullName` (or username)
- **Email:** `primaryEmailAddress.emailAddress`
- **`<PlanBadge>`** + `"Member since {month year}"`

#### Quick Stats Grid (2-cell)
- **Current Streak:** `user.streak_days` days + `Flame` icon
- **Target Band:** `user.target_band` / 12 + `Target` icon

#### Manage Account Button
Opens the Clerk `openUserProfile()` modal — allows name, email, password,
and connected account management.

**ID:** `#btn-manage-clerk-account`

---

## 3. `tabs/GoalTab.tsx` — Band Goal Setting

**Type:** `"use client"`  
**Hook:** `useSetTargetBand()` → `PATCH /api/v1/users/me` `{ target_band }`

### Purpose
Lets users update their target CELPIP band score (4–12). This value is used
throughout the app to personalise AI feedback, sample responses, and coaching
tips.

### Props
None — reads `user.target_band` from `useCurrentUser()`.

### UI Interaction Flow

```
Mount → pre-fill selected with user.target_band
Click band button → setSelected(band)
changed = (selected !== user.target_band)  ← enables Save button
Click "Save goal" → mutateAsync({ target_band: selected })
    → success: setSaved(true) → "Saved!" for 2.5s → revert
    → error: "Failed to save. Please try again." message
```

### Band Grid
`grid-cols-5 sm:grid-cols-9` — one button per band (4, 5, 6, 7, 8, 9, 10, 11, 12).

**Active button:** `border-amber-500/60 bg-amber-500/10 text-amber-400`  
**Inactive:** `border-white/[0.08] bg-white/[0.02] text-white/40`

**ID:** `#band-option-{N}` per button, `#btn-save-target-band`

### `BAND_LABELS` constant
Maps band number → descriptive label (e.g. `7 → "Competent"`). Shown
next to the selected band as `"Band 7 — Competent"`.

### Save Button States

| State | Label | Enabled |
|-------|-------|---------|
| No change | "Save goal" | `false` |
| Changed | "Save goal" | `true` |
| Pending | `Loader2` + "Saving…" | `false` |
| Saved (2.5s) | `Check` + "Saved!" | `false` |

---

## 4. `tabs/SubscriptionTab.tsx` — Plan & Billing Overview

**Type:** `"use client"`  
**Hook:** `useBilling()` — same hook as billing page

### Purpose
Read-only subscription summary within Settings. Shows current plan, included
limits, and links to `/billing` for upgrades or the Stripe portal for receipts.

### Content
- Current plan name + icon
- Included limits (speaking/writing attempts per task)
- `"View Billing Page →"` link to `/billing`
- `"View Receipts"` → Stripe portal (only if `has_active_purchase`)

---

## 5. `tabs/PrivacyTab.tsx` — Data & Privacy Controls

**Type:** `"use client"`  
**Hook:** `usePrivacySettings()` → `GET /api/v1/users/me/privacy`

### Purpose
Privacy and data transparency controls.

### Sections

#### Data We Collect
Informational: explains what data is stored (recordings, transcripts,
AI scores) and how long they are retained.

#### Analytics Opt-Out
Toggle to opt out of anonymous usage analytics (Vercel Analytics / Posthog).
Persisted to `localStorage` and respected on page load.

#### Export My Data
Button to request a full data export (sent to account email).

#### Retention Policy
Informational text about recording storage duration and deletion schedule.

---

## 6. `tabs/DangerTab.tsx` — Account Deletion

**Type:** `"use client"`  
**Hook:** `useDeleteAccount()` → `DELETE /api/v1/users/me`

### Purpose
Irreversible account deletion with a typed keyword confirmation gate.

### Two-Phase UX

**Phase 1 (Idle):**
- Red-bordered section explaining what will be deleted
- `"Delete my account"` button → sets `confirmOpen = true`

**ID:** `#btn-open-delete-confirm`

**Phase 2 (Confirm):**
- `"Type DELETE to confirm:"` label
- Text input (auto-focused) — `canDelete = (confirmText === "DELETE")`
- `"Confirm delete"` button — enabled only when `canDelete = true` and not pending
- `"Cancel"` button → resets to Phase 1

**ID:** `#btn-confirm-delete`

### Deletion Flow
```
mutateAsync()
    → success: router.push("/")    ← user is signed out by the API
    → error:   deleteAccount.isError → red error message shown
```

### Destructive Action Protocol
- `"DELETE"` keyword prevents accidental taps
- Button disabled during `isPending` (spinner shown)
- Both buttons disabled during `isPending`
- Error rendered inline (not a toast — must be visible without dismiss)

---

## 7. Shared Sub-Components (`settings/shared/`)

### `Section.tsx`
Wrapper card with title + optional description:
```typescript
interface SectionProps {
  title:        string;
  description?: string;
  children:     React.ReactNode;
}
```
Renders: `<h2>` title + `<p>` description + `children` in a `rounded-2xl border bg-surface p-6` card.

### `PlanBadge.tsx`
Inline coloured badge for the user's plan:
```
starter → grey/muted "Starter" pill
pro     → amber "Pro" pill + Rocket icon
ultra   → amber "Ultra" pill + Trophy icon
```

---

## Settings Data Flow

```
GET /api/v1/users/me
    → { plan, target_band, streak_days }

PATCH /api/v1/users/me
    → Body: { target_band: number }
    → React Query mutation → invalidates ["currentUser"]

DELETE /api/v1/users/me
    → Deletes user record, recordings, attempts, AI reports
    → Returns 204 → client navigates to "/"
```

### Hooks Summary

| Hook | Source | Purpose |
|------|--------|---------|
| `useCurrentUser()` | `lib/hooks/useCurrentUser` | Platform user data |
| `useUser()` + `useClerk()` | `@clerk/nextjs` | Auth identity + profile modal |
| `useSetTargetBand()` | `lib/hooks/useAccount` | PATCH target_band mutation |
| `useDeleteAccount()` | `lib/hooks/useAccount` | DELETE account mutation |
| `useBilling()` | `lib/hooks/useBilling` | Plan limits + portal |
