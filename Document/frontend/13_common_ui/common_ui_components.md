# CELPIP PRO — Common UI Components

**Author:** Senior Web Developer  
**Location:** `apps/web/components/common/`  
**Pattern:** Shared, reusable atoms used across speaking, writing, exam, report,
and dashboard modules. All components are stateless/presentational unless noted.

---

## 1. `TimerRing.tsx` — SVG Circular Countdown Ring

**Type:** Server Component (pure SVG, no state)

### Purpose
Visual countdown ring used in the speaking **PREP** and **RECORD** phases.
Depletes clockwise as seconds tick down.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `secondsLeft` | `number` | — | Current seconds remaining |
| `totalSeconds` | `number` | — | Total phase duration (used to compute percentage) |
| `sizePx` | `number` | `160` | Rendered SVG diameter in px |
| `className` | `string?` | — | Extra CSS classes |

### Geometry
- `strokeWidth` = `sizePx × 0.065` (scales proportionally)
- `trackR` = `center − strokeWidth/2 − 2` (keeps stroke inside viewBox)
- `circumference` = `2π × trackR`
- `dashOffset` = `circumference × (1 − pct)` — `0` = full ring, `circumference` = empty

### Colour Transitions

| Remaining | Colour | Hex |
|-----------|--------|-----|
| > 50% | Indigo (primary) | `#6366F1` |
| 25–50% | Amber (warning) | `#FBBF24` |
| < 25% | Red (danger) | `#F87171` |

Colour transition: `stroke 0.5s ease`  
Dashoffset transition: `stroke-dashoffset 0.95s linear`

### Key Design Decision
`transform="rotate(-90)"` is a **static SVG attribute**, not a CSS animation.
This shifts the ring start from 3 o'clock → 12 o'clock without any rotation
side effects. `aria-hidden="true"` — screen readers get the text countdown
label from the parent.

---

## 2. `ProcessingScreen.tsx` — AI Analysis Loading Screen

**Type:** Server Component (pure presentation)

### Purpose
Full-page loading screen displayed after audio upload or essay submission
completes, while the Celery AI pipeline is running. Shown during the
`PROCESSING` session phase.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `skill` | `"speaking" \| "writing"` | Controls copy and icon |
| `className?` | `string` | Optional wrapper class override |

### Per-Skill Copy

| Skill | Icon | Heading | Body |
|-------|------|---------|------|
| `speaking` | `Mic` | "Analyzing Your Response" | Mentions vocabulary, grammar, coherence, pronunciation |
| `writing` | `PenLine` | "Reviewing Your Essay" | Mentions task achievement, coherence, lexical resource, grammar |

### Visual Elements
1. **Pulsing icon ring** — `animate-pulse-ring` on outer `<span>`, icon inside bordered circle
2. **Spinner** — `Loader2` with `animate-spin`
3. **Heading + body copy** — centred, `max-w-sm`
4. **Progress dots** — 3 `animate-pulse` dots with staggered `animation-delay-300`,
   `animation-delay-500` delays (defined in `globals.css`)

### Usage
```tsx
// In SpeakingSession.tsx or WritingSession.tsx:
if (phase === "PROCESSING") return <ProcessingScreen skill="speaking" />;
```

---

## 3. `PaywallModal.tsx` — Quota Exceeded Upgrade Prompt

**Type:** `"use client"`  
**Trigger:** 402 response from attempt creation API

### Purpose
Radix UI `<Dialog>` modal that appears when a user hits their plan quota limit.
Non-blocking — can be dismissed. Routes user to `/billing` to upgrade.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls dialog visibility |
| `onClose` | `() => void` | Called on X button or backdrop click |
| `skill` | `Skill` (`"speaking" \| "writing"`) | Controls icon and copy |

### Dynamic Copy
Practice limit is computed from constants:
```typescript
skill === "speaking"
  → `${8 × PRO_PLAN_LIMITS.speaking_attempts_per_task} focused Speaking practices`
skill === "writing"
  → `${2 × PRO_PLAN_LIMITS.writing_attempts_per_task} focused Writing practices`
```

### Structure
- **Skill icon** (Mic / PenLine) in `primary/10` rounded square
- **Title:** `"You've used your free {noun}"`
- **Pro plan card:** price + practice count + Ultra "coming soon" note
- **CTA:** `View Pro Plan` → `/billing`
- **Dismiss:** `Not now` button

---

## 4. `TosGateModal.tsx` — Terms of Service Acceptance Gate

**Type:** `"use client"` — blocks all page content until accepted  
**Mounted in:** Authenticated layout (`app/(main)/layout.tsx`)

### Purpose
A **non-dismissable, full-screen overlay** that blocks the entire app until
the signed-in user accepts the current TOS version. Critical for legal compliance.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `tosVersion` | `string \| null \| undefined` | Version the user has accepted |
| `tosAcceptedAt` | `string \| null \| undefined` | Timestamp of acceptance |

### Activation Condition
```typescript
const needsAcceptance = !tosAcceptedAt || tosVersion !== TOS_CURRENT_VERSION;
if (!needsAcceptance) return null;
```

`TOS_CURRENT_VERSION = "2026-04-22"` — must match `settings.TOS_CURRENT_VERSION`
on the backend. Bump both to force re-acceptance on policy changes.

### Acceptance Flow
```
User checks checkbox (agreed = true)
    ↓ clicks "I Agree — Continue to CELPIPBRO"
useAcceptTos.mutateAsync({ version: TOS_CURRENT_VERSION })
    → POST /api/v1/users/me/tos-accept
    → On success: useCurrentUser() cache invalidated → modal disappears
    → On error: red error message shown (modal stays open)
```

### Security Design
- `z-[9999]` — renders above all other modals and drawers
- `pointer-events: all` on backdrop — blocks all underlying clicks
- CTA button: `disabled={!agreed || isPending}` — prevents accidental submission
- Key ID: `#tos-checkbox`, `#tos-agree-btn`

---

## 5. `ScoreBadge.tsx` — Band Score Pill

**Type:** Server Component

### Purpose
Coloured pill displaying an AI-estimated CELPIP band score. Used in history
rows, dashboard stats, and report headers.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `band` | `number` | 1–12 CELPIP band |
| `size` | `"sm" \| "md" \| "lg"` | Controls font and padding |

### Colour Scale

| Band | Background | Text |
|------|-----------|------|
| ≥ 9 | `success/15` | `success` |
| 7–8.9 | `primary/15` | `primary` |
| 5–6.9 | `warning/15` | `warning` |
| < 5 | `destructive/15` | `destructive` |

---

## 6. `SkillBadge.tsx` — Speaking / Writing Label Pill

**Type:** Server Component

### Purpose
Compact coloured pill identifying the skill type on history and report rows.

| Skill | Icon | Colour |
|-------|------|--------|
| `speaking` | `Mic` | `primary` |
| `writing` | `PenLine` | `success` |

---

## 7. `StatusBadge.tsx` — Attempt Status Indicator

**Type:** Server Component

Shows the current processing status of an attempt. Used in history rows
when no band score is available yet.

| Status | Label | Colour |
|--------|-------|--------|
| `pending` | Pending | `subtle` |
| `processing` | Processing | `primary` (+ spinner dot) |
| `complete` | Complete | `success` |
| `failed` | Failed | `destructive` |
| `cancelled` | Cancelled | `subtle` |

---

## 8. `ProgressBar.tsx` — Linear Score Bar

**Type:** Server Component

Animated horizontal bar used in the report's dimension breakdown panel and
weak area panel.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Current score (0–12) |
| `max` | `number` | Max score (always 12) |
| `colour` | `string` | Tailwind colour class for the fill |
| `animate` | `boolean?` | Enables width transition on mount |

---

## 9. `BandRangeChip.tsx` — Likely Band Range Display

**Type:** Server Component  
**Used in:** Score report header

Renders the AI's likely range string (e.g. `"8–9"`) as an outlined pill:
`border border-border bg-muted text-foreground text-xs font-semibold px-3 py-1 rounded-full`.

---

## 10. `PlanGateBanner.tsx` — Inline Plan Lock Banner

**Type:** Server Component

Compact amber banner shown inside Starter users' report pages where Pro-only
content is locked. Contains a `"Upgrade to Pro"` link to `/billing`.

```
⚡ This content is available on the Pro plan.  [Upgrade to Pro →]
```

---

## 11. `ErrorState.tsx` — Full-Page Error Display

**Type:** Server Component  
**Used in:** Route-level error boundaries (`error.tsx` files)

### Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Short error heading |
| `description` | `string?` | Explanatory text |
| `retry` | `() => void` | Reset/retry callback |
| `ctaLabel` | `string?` | Optional navigation link label |
| `ctaHref` | `string?` | Optional navigation link href |

---

## 12. `EmptyState.tsx` — Empty Data Placeholder

**Type:** Server Component  
**Used in:** History pages, prompt grids with no results

### Props
`icon`, `title`, `description`, `cta?`, `ctaHref?`

Renders centred icon + copy in a dashed-border rounded container.
