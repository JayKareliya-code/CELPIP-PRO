# CELPIP PRO — History & Attempts Components

**Author:** Senior Web Developer  
**Location:** `apps/web/components/history/`  
**Route:** `app/(main)/history/page.tsx`

---

## 1. `HistoryPage.tsx` — Page Orchestrator + View Toggle

**Type:** `"use client"`  
**State:** `view: ViewMode`, `skill: Skill | null`, `page: number`  
**Hook:** `useHistory(skill, page)` — only called when `view === "practice"`

### Purpose
Root client component for `/history`. Manages two distinct views via a top-right
toggle — Practice attempts and Mock Exam sessions — and composes their respective
sub-sections.

### View Modes

| View | Component rendered |
|------|--------------------|
| `"practice"` | `HistoryFilterBar` + `StatsSummary` + `HistoryTable` |
| `"mock"` | `MockExamHistorySection` |

### View Toggle UI
`role="tablist"` pill toggle in the page header:
- `"🎤 Practice"` → shows paginated individual attempts
- `"📋 Mock Exams"` → shows grouped exam sessions

### Filter Reset on Tab Switch
```typescript
handleViewChange(v: ViewMode) { setView(v); setPage(1); setSkill(null); }
handleSkillChange(s: Skill | null) { setSkill(s); setPage(1); }
```
Page and skill filters always reset when the view changes.

### `StatsSummary` Sub-Component (Practice only)
Shown when `history.total > 0`. 4-cell `grid-cols-2 sm:grid-cols-4` strip:
- **Total Attempts** — `history.total`
- **Completed** — attempts where `status === "complete"`
- **Avg. Band** — computed from completed band scores (1dp)
- **Best Band** — `Math.max(...bands).toFixed(1)`

All computed client-side from `PaginatedHistory.items` — no extra API call.

---

## 2. `HistoryFilterBar.tsx` — Skill Filter Pills

**Type:** `"use client"`

### Purpose
Compact skill filter bar above the `HistoryTable`. Three buttons:
`All` | `Speaking` | `Writing`.

### Props
`active: Skill | null`, `onChange: (skill: Skill | null) => void`

### Behaviour
- `null` → "All" selected — unfiltered history
- `"speaking"` / `"writing"` → passes skill filter to `useHistory`

---

## 3. `HistoryTable.tsx` — Responsive Attempt Table

**Type:** `"use client"`  
**Responsive:** Mobile = card list; Desktop (`md+`) = data table

### Props

| Prop | Type | Description |
|------|------|-------------|
| `history` | `PaginatedHistory \| undefined` | Paginated API response |
| `isLoading` | `boolean` | |
| `isError` | `boolean` | |
| `page` | `number` | Current page (1-indexed) |
| `onPageChange` | `(page: number) => void` | |
| `activeSkill` | `Skill \| null` | Used to tailor empty state message |

### Desktop Table Columns
`Date` | `Skill` | `Task` | `Band` | `Status` | `Report →`

- **Date:** `timeAgo(created_at)` — relative time
- **Skill:** `<SkillBadge>` component
- **Task:** Task title + `"Task N"` sub-label
- **Band:** `<ScoreBadge band={...} size="sm">` or `—`
- **Status:** `<StatusBadge status={...}>` — `complete / processing / failed / pending`
- **Report:** `"View ↗"` link to `/attempts/{id}/report` (only when `complete`)

### Mobile: `AttemptCard` Sub-Component
One tappable card per attempt. When `isComplete`, wraps in `<Link>`.
Uses `AttemptStateBadge` (unified) instead of separate Score + Status badges.

### `AttemptStateBadge` — Unified State Badge (mobile only)

| Condition | Badge |
|-----------|-------|
| `complete` + score | Colour-coded band number (emerald/amber/rose) |
| `processing` | Amber spinner + `"Scoring"` |
| `failed` | Red `XCircle` + `"Failed"` |
| `pending` / `cancelled` | Clock icon + text |

### Loading Skeletons
- **Mobile:** 5 `SkeletonCard` pulse placeholders
- **Desktop:** 5 `SkeletonRow` pulse placeholders (matches table column count)

During pagination re-fetch (data present, `isLoading=true`): 60% opacity
+ `pointer-events-none` overlay — preserves layout while fetching.

### Pagination
`PaginationFooter` component at the bottom. Shows `"Showing 1–20 of 47 attempts"`.

### Empty State
`<EmptyState>` with skill-specific message when `history.items.length === 0`.

---

## 4. `MockExamHistorySection.tsx` — Grouped Mock Exam Sessions

**Type:** `"use client"`  
**Hook:** `useMockExamHistory(page)` → `GET /api/v1/attempts/mock?page={n}`

### Purpose
Paginated list of past mock exam sessions. Each session is an accordion card
that expands to show per-task results.

### `SessionCard` Sub-Component

**Collapsed header shows:**
- Session type label: `"Speaking Mock Exam"` or `"Writing Mock Exam"`
- Relative time: `timeAgo(created_at)`
- Progress bar: `(tasks_complete / tasks_total) × 100%` with `"N/M tasks scored"` label
- Avg band: `<ScoreBadge band={avg_band} size="md">` + `"avg band"` label
- `ChevronDown/Up` toggle icon

**Expanded breakdown (`border-t` section):**
Grid columns: `# | Task name | Status icon | Band`  
One `TaskRow` per task, sorted by `task_number` ascending.

**`StatusIcon` per task:**
- `complete` → `CheckCircle2` emerald
- `failed` → `XCircle` red
- `processing` → `Loader2 animate-spin` amber
- else → `Clock` subtle

`avg_band` is derived server-side from all completed tasks in the session.

### `MockExamSession` and `MockExamTaskResult` Types

```typescript
interface MockExamSession {
  session_id:     string;
  skill:          "speaking" | "writing";
  created_at:     string;
  tasks_total:    number;
  tasks_complete: number;
  avg_band:       number | null;
  tasks:          MockExamTaskResult[];
}

interface MockExamTaskResult {
  task_number:    number;
  attempt_id:     string;
  status:         "complete" | "failed" | "processing" | "pending";
  estimated_band: number | null;
}
```

### Skeleton
3 `SkeletonCard` pulse cards while loading.

### Empty State
`"No mock exams yet — complete a full mock exam to see your session results here."`

---

## History Data Flow

```
GET /api/v1/attempts?skill={speaking|writing|null}&page={n}&limit=20
    → PaginatedHistory {
        items: AttemptHistoryItem[],
        total, limit, has_next
      }

GET /api/v1/attempts/mock?page={n}&limit=10
    → PaginatedSessions {
        items: MockExamSession[],
        total, limit, has_next
      }
```

### `useHistory(skill, page)` Hook
React Query wrapper with `keepPreviousData: true` — prevents flash of
empty state during page transitions.

### `useMockExamHistory(page)` Hook
Fetches `MockExamSession[]` with per-task results embedded.

---

## Common Sub-Components used by History

| Component | Location | Purpose |
|-----------|----------|---------|
| `ScoreBadge` | `common/ScoreBadge.tsx` | Colour-coded band pill |
| `StatusBadge` | `common/StatusBadge.tsx` | `complete / processing / failed / pending` pill |
| `SkillBadge` | `common/SkillBadge.tsx` | Speaking / Writing icon + label |
| `EmptyState` | `common/EmptyState.tsx` | Standard empty state layout |
| `PaginationFooter` | `common/PaginationFooter.tsx` | Page navigation with count label |
