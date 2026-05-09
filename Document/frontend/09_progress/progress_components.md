# CELPIP PRO — Progress Components

**Author:** Senior Web Developer  
**Location:** `apps/web/components/progress/`  
**Route:** `app/(main)/progress/page.tsx`  
**Access gate:** Pro / Ultra only — Starter sees `StarterGate` upgrade prompt

---

## 1. `ProgressPageClient.tsx` — Page Orchestrator

**Type:** `"use client"`  
**Hooks:** `useCurrentUser()`, `useProgressData(skill)`

### Purpose
Root client component for `/progress`. Manages the active skill tab
(Speaking / Writing), gates Starter users, and delegates to `SkillSection`
for each skill's content.

### Render Decision Tree

```
useCurrentUser().isLoading
    → Skeleton (4 stat + 4 grid pulse placeholders)
user.plan === "starter"
    → Header + StarterGate
user.plan === "pro" | "ultra"
    → Header + SkillTab row + <SkillSection key={activeSkill} />
```

`key={activeSkill}` on `SkillSection` — forces remount + fresh `useProgressData()`
fetch when switching between Speaking and Writing tabs.

### `SkillTab` Sub-Component

```typescript
interface SkillTabProps {
  skill:    Skill;           // "speaking" | "writing"
  active:   Skill;           // currently selected
  onSelect: (s: Skill) => void;
}
```

- Active: `border-primary/40 bg-primary/10 text-primary`
- Inactive: `border-border bg-surface text-subtle hover:border-primary/30`
- Shows skill label + task count (`"8 tasks"` / `"2 tasks"`)
- `aria-pressed` for accessibility

### `StarterGate` Sub-Component
Centred dashed-border upgrade prompt:
- `TrendingUp` icon in `primary/10` circle
- Heading: "Track Your Progress"
- Two CTAs: **"Upgrade to Pro"** (primary) + **"Practice Speaking"** (outlined)
- Footnote: "Starter plan includes 1 full mock test per skill."

### `SkillSection` Sub-Component

```typescript
function SkillSection({ skill }: { skill: Skill }) {
  const { taskStats, overviewStats, recentItems, isLoading, isError }
    = useProgressData(skill);
  // ...
}
```

**Layout (top → bottom):**
1. `ProgressOverviewStats` — 4-cell stats strip
2. `TaskScoreGrid` — per-task score cards
3. `RecentAttemptsFeed` — last N attempts list

---

## 2. `ProgressOverviewStats.tsx` — 4-Cell Summary Strip

**Type:** `"use client"`

### Purpose
A 4-column stat strip showing high-level progress metrics for the selected skill.

### Props
`stats: OverviewStats | null`, `isLoading: boolean`, `skill: Skill`

### Stats Displayed

| Stat | Description | Source |
|------|-------------|--------|
| Total Attempts | Across all tasks for this skill | `overviewStats.total_attempts` |
| Avg Band | Mean across all recent attempts | `overviewStats.avg_band` |
| Best Band | Highest single-attempt band | `overviewStats.best_band` |
| Active Tasks | Tasks with ≥ 1 attempt | `overviewStats.active_task_count` |

Loading state: `animate-pulse` rectangle per cell.  
Empty state: dashes `"—"` displayed when no attempts exist.

### Layout
`grid-cols-2 sm:grid-cols-4 gap-3`

---

## 3. `TaskScoreGrid.tsx` — Per-Task Score Cards

**Type:** `"use client"`

### Purpose
One score card per task showing band trend, attempt count, and a mini
sparkline chart. Displayed for all tasks even if no attempts yet.

### Props
`skill: Skill`, `taskStats: TaskStat[]`, `isLoading: boolean`

### `TaskStat` Structure
```typescript
interface TaskStat {
  task_number:    number;
  task_label:     string;            // e.g. "Giving Advice"
  attempt_count:  number;
  avg_band:       number | null;
  best_band:      number | null;
  latest_band:    number | null;
  band_history:   number[];          // last N bands for sparkline
}
```

### Card States

| State | Visual |
|-------|--------|
| `attempt_count === 0` | Grey "No attempts yet" placeholder |
| 1–2 attempts | Band displayed, no sparkline |
| ≥ 3 attempts | Band + `ScoreSparkline` chart |

### Band Colour
Reuses `bandPalette()` pattern:
- ≥ 9 → emerald
- ≥ 6 → amber
- < 6 → rose

### Layout
Speaking: `grid-cols-2 lg:grid-cols-4` (8 tasks → 2 rows of 4)  
Writing: `grid-cols-1 sm:grid-cols-2` (2 tasks)

### Skeleton
`animate-pulse` card per task slot — correct count for skill.

---

## 4. `ScoreSparkline.tsx` — Mini Band Trend Chart

**Type:** Server Component (pure SVG, no state)

### Purpose
A compact inline SVG line chart showing the band score trend across the
last N attempts. Rendered inside `TaskScoreGrid` task cards.

### Props
`bands: number[]`, `width?: number`, `height?: number`

### Implementation
- SVG polyline, no external chart library
- X-axis: attempt index (evenly spaced)
- Y-axis: band 1–12
- Line colour: matches `bandPalette()` of the latest band
- Last point: filled circle highlight

### Empty guard
Returns `null` when `bands.length < 2` — avoids a single-point meaningless line.

---

## 5. `WeakAreaPanel.tsx` — Rubric Dimension Breakdown

**Type:** `"use client"`  
**Plan gate:** Ultra only — Pro/Starter see a `LockedState` overlay  
**Hook:** `useWeakAreas()` → `GET /api/v1/progress/weak-areas`

### Purpose
Shows an average score bar per CELPIP rubric dimension, sorted by weakest
first. Helps users identify which specific areas (e.g. Fluency, Vocabulary,
Grammar) need the most attention.

### Dimension Colour Scale

| Avg Score | Bar | Text |
|-----------|-----|------|
| ≥ 9 | `bg-success` | `text-success` |
| ≥ 7 | `bg-success/60` | `text-success/80` |
| ≥ 5 | `bg-warning` | `text-warning` |
| < 5 | `bg-danger` | `text-danger` |

### `DimensionBar` Sub-Component
```typescript
interface DimensionBarProps {
  label:         string;   // e.g. "Vocabulary Range"
  avg_score:     number;   // 0–12
  attempt_count: number;   // shown as context
}
```

Bar width: `(avg_score / 12) × 100%`  
Transition: `duration-700` (smooth fill animation on mount)

### `LockedState` (Pro/Starter)
Blurred preview rows (5 fake dimension bars) behind:
- `backdrop-blur-sm bg-surface/80` overlay
- `"Ultra Plan"` badge + heading
- `"Upgrade to Ultra"` CTA → `/billing`

### Sorted Output
Items sorted by `avg_score` ascending — weakest first.  
Footer note: *"Sorted by weakest dimension first. Focus your practice on the lowest bars."*

### Empty State
`"No dimension data yet — complete a few scored attempts to see your breakdown."`

---

## 6. `RecentAttemptsFeed.tsx` — Paginated Attempt List

**Type:** `"use client"`

### Purpose
Paginated list of recent attempts for the selected skill on the progress page.
More detailed than the dashboard's compact 5-item view — supports pagination.

### Props
`items: HistoryItem[]`, `skill: Skill`, `isLoading: boolean`

### Row Structure
Each row: `SkillBadge` | task title + `timeAgo()` | `ScoreBadge` | "View →" link

### Pagination
"Load more" button at the bottom. Calls `useProgressData(skill, page + 1)` on click.

### Empty State
`"No {skill} attempts yet — start practising to build your history."`

---

## Progress Data Flow

```
GET /api/v1/progress?skill={speaking|writing}&limit=30
    → {
        overview_stats: {
          total_attempts, avg_band, best_band, active_task_count
        },
        task_stats: TaskStat[],
        recent_items: HistoryItem[]
      }

GET /api/v1/progress/weak-areas
    → WeakArea[] { dimension, label, avg_score, attempt_count }
```

### `useProgressData(skill)` Hook
Fetches the aggregated progress endpoint. Shared between `ProgressPageClient`
(progress page) and `WeakAreasCompact` (dashboard preview).

| Returned | Type | Description |
|----------|------|-------------|
| `overviewStats` | `OverviewStats \| null` | 4 headline stats |
| `taskStats` | `TaskStat[]` | Per-task score arrays |
| `recentItems` | `HistoryItem[]` | Latest 30 attempts |
| `isLoading` | `boolean` | |
| `isError` | `boolean` | |

### `useWeakAreas()` Hook
Fetches dimension averages. Only called when `user.plan === "ultra"`.
Returns `{ items: WeakArea[], isLoading }`.
