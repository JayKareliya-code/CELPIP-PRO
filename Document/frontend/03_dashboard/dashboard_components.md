# CELPIP PRO — Dashboard Components

**Author:** Senior Web Developer  
**Framework:** Next.js 14, React Query, Zustand  
**Location:** `apps/web/components/dashboard/`  
**Route:** `app/(main)/dashboard/page.tsx` — authenticated users only

---

## 1. `WelcomeBanner.tsx` — Personalised Greeting

**Type:** `"use client"`  
**Data source:** `useCurrentUser()` hook → `GET /api/v1/users/me`

### Purpose
Renders a time-aware, personalised greeting as the dashboard `<h1>`.
Shows a streak counter when the user has consecutive active days.

### Hydration Safety Pattern
Sets a neutral greeting (`"Hello, {firstName}"`) as the initial state to
prevent server/client HTML mismatch. Updates to the time-aware version
(`"Good morning/afternoon/evening, {firstName}"`) in `useEffect` — runs
only on the client after mount.

```typescript
function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
```

### Streak Display
Renders `🔥 {n} day(s) streak` inline in `text-subtle` when `streak_days > 0`.
Hidden entirely when streak is zero.

### Loading State
Shows a `animate-pulse` skeleton shimmer (`h-7 w-56`) while `isLoading = true`.

### Props
None — reads `useCurrentUser()` internally.

---

## 2. `DashboardStatusRow.tsx` — Three-Column Stat Strip

**Type:** `"use client"`  
**Data sources:**
- `useCurrentUser()` → `target_band`, `plan`
- `useDashboardStats()` → latest speaking/writing band scores
- `useSetTargetBand()` → React Query mutation for inline editing

### Purpose
A `3-column grid` showing the user's latest Speaking band, latest Writing band,
and their Target Band with an inline edit capability.

### Sub-Components

#### `StatCell`

```typescript
interface StatCellProps {
  label:     string;          // e.g. "Speaking"
  value:     React.ReactNode; // e.g. "8.5" or "—" when no data
  sublabel?: string;          // e.g. "Latest band score"
  loading?:  boolean;         // Shows pulse skeleton when true
  action?:   React.ReactNode; // Optional action button (edit pencil)
}
```

When `loading = true`: renders an `animate-pulse` rectangle instead of the
value, preventing layout shift.

#### `TargetBandCell`

An inline band editor embedded directly in the stat cell. Two visual states:

**View mode** — `StatCell` with a pencil `Pencil` icon action button  
**Edit mode** — Replaces the cell with a `5×2 grid` of band selector buttons
(Band 4–12) + Save/Cancel buttons

**Mutation flow:**
```
User clicks Save
    → useSetTargetBand.mutateAsync({ target_band: draft })
    → PUT /api/v1/users/me/profile
    → On success: setEditing(false)
    → On error: shows inline "Failed to save. Try again." message
```

**Band options:** `[4, 5, 6, 7, 8, 9, 10, 11, 12]`  
**Selected band styling:** `border-primary bg-primary/10 text-primary`

### Loading Behaviour
`loading = userLoading || statsLoading` — both sources must resolve before
cells exit skeleton state.

### Layout
`grid grid-cols-3 gap-2 sm:gap-3`

---

## 3. `QuickStartCard.tsx` — Speaking & Writing Navigation Shortcuts

**Type:** Server Component (no `"use client"`)

### Purpose
Two side-by-side navigation links giving immediate access to the two main
practice modules. The most clicked element on the dashboard.

### Actions Defined

| ID | Label | Sublabel | Route |
|----|-------|---------|-------|
| `quick-start-speaking` | Speaking | Tasks 1–8 · up to 90 sec | `/speaking` |
| `quick-start-writing` | Writing | Tasks 1–2 · up to 27 min | `/writing` |

### Hover Interaction
`ArrowRight` icon slides in from left on hover:
- Default: `opacity-0 -translate-x-1`
- Hover: `opacity-100 translate-x-0` (150ms transition)
- Hidden on mobile (`hidden sm:block`)

Icon colour: `text-subtle` → `text-primary` on hover via `group-hover:text-primary`

### Layout
`grid grid-cols-2 gap-3`

---

## 4. `RecentAttemptsCompact.tsx` — Last 5 Attempts Feed

**Type:** `"use client"`  
**Data source:** `useHistory(null, 1)` — page 1, all skills, limit 5

### Purpose
A compact attempt list showing the 5 most recent practice attempts.
Provides quick links to individual reports. Acts as a preview; full history
lives at `/history`.

### Sub-Components

#### `SkeletonRow`
`animate-pulse` placeholder row — 4 rectangles mimicking `[skill badge] [title] [score] [link]`.
5 skeleton rows are rendered during `isLoading`.

#### `AttemptRow`

| Slot | Component | Condition |
|------|-----------|-----------|
| Left | `SkillBadge` | Always |
| Centre | Task title + `timeAgo()` timestamp | Always |
| Right | `ScoreBadge` (if band available) OR `StatusBadge` | Band present → score; else status |
| Far right | `View ↗` link to `/attempts/{id}/report` | Only when `status === "complete"` |

`timeAgo()` — utility from `lib/utils.ts` that converts ISO timestamps to
relative strings (e.g. `"2 hours ago"`, `"yesterday"`).

### Empty State
`"No attempts yet — start practising to see your history here."`

### Error State
`"Could not load attempts."` + inline `Retry` button that calls `window.location.reload()`.

### Header
`h2 "Recent Attempts"` + `"View all →"` link to `/history` (right-aligned).

---

## 5. `WeakAreasCompact.tsx` — Dashboard Weak Areas Preview

**Type:** `"use client"`  
**Data source:** `useProgress()` hook — fetches aggregated dimension scores

### Purpose
A compact version of the full `WeakAreaPanel` (from the progress page),
showing the top 2–3 weakest scoring dimensions. Links to `/progress` for
the full breakdown.

### Display Logic
Filters dimensions where `score < threshold` (e.g. below 7.0), sorted
ascending by score. Renders a compact bar with a colour-coded score badge.

---

## 6. `RecentAttemptsWidget.tsx` — Widget Wrapper

**Type:** Server Component  
**Wraps:** `RecentAttemptsCompact`

Adds a labelled section heading and the `"View all →"` link as a
section-level header. Keeps the section semantics separate from the
data-fetching logic inside `RecentAttemptsCompact`.

---

## Dashboard Page Composition

Assembled in `app/(main)/dashboard/page.tsx`:

```tsx
<WelcomeBanner />                    // h1 greeting + streak
<DashboardStatusRow />               // 3-col stats: speaking | writing | target
<QuickStartCard />                   // Speaking + Writing nav shortcuts
<RecentAttemptsWidget />             // Last 5 attempts
<WeakAreasCompact />                 // Top weak dimensions
```

### Data Flow Summary

```
Page load
    ↓
useCurrentUser()        → GET /api/v1/users/me
useDashboardStats()     → GET /api/v1/history (derived — latest bands per skill)
useHistory(null, 1)     → GET /api/v1/history?page=1&limit=5
useProgress()           → GET /api/v1/progress (weak areas)
```

All hooks use React Query with `staleTime: 30_000` ms (30 seconds) by default.
Skeleton states shown independently per section — no single page-level loading gate.
