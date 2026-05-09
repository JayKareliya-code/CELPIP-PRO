# CELPIP PRO — Speaking Components

**Author:** Senior Web Developer  
**Location:** `apps/web/components/speaking/`  
**Route group:** `app/(main)/speaking/`

---

## 1. `SpeakingModuleHome.tsx` — Module Landing Page

**Type:** `"use client"`  
**Input props:** `tasks: SpeakingTask[]` (passed from server component via RSC → client boundary)  
**Data hooks:** `useCurrentUser()`, `useQuota("speaking")`

### Purpose
The `/speaking` route page. Renders a header, a conditional Starter-plan
upgrade banner, a 3-stat info strip (Pro/Ultra only), and a 2-column grid
of `SpeakingTaskCard` components for Tasks 1–8.

### Key Logic

#### `promptCountByTask` (memoised)
Groups the flat `tasks[]` array by `task_number` to compute how many distinct
prompts are available per task. Displayed in each task card's footer.

```typescript
const promptCountByTask = useMemo(() => {
  const counts: Record<number, number> = {};
  for (const t of tasks) counts[t.task_number] = (counts[t.task_number] ?? 0) + 1;
  return counts;
}, [tasks]);
```

#### `uniqueTasks` (memoised)
De-duplicates `tasks[]` to one canonical row per `task_number` (sorted ascending).
If DB returns no data, falls back to placeholder `[1, 2, 3, 4, 5, 6, 7, 8]`.

#### `isBonusRetryMode`
```typescript
isBonusRetryMode = attemptsLimit !== null && attemptsUsed >= attemptsLimit && !isStarter
```
When true, the card shows `"∞ retries"` chip and amber fill — signals that
the plan quota is exhausted but unlimited same-prompt retries remain.

### Starter Banner
Amber gradient banner with `"Upgrade →"` link to `/billing`. Shown only when
`plan === "starter"`.

### Stats Strip (Pro/Ultra only)
3-cell `grid-cols-3` showing: **Tasks** | **Attempts/task** | **Bonus retries: Unlimited**.

### Card Grid
`grid-cols-1 sm:grid-cols-2 gap-4` — one `SpeakingTaskCard` per task number.

---

## 2. `SpeakingTaskCard.tsx` — Task Selection Card

**Type:** `"use client"` (uses `cn` and dynamic styles)  
**Pattern:** When `isLocked=true` → renders bare `div`; when unlocked → wraps in `<Link href={href}>`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `taskNumber` | `number \| "practice"` | Task 1–8 or "practice" |
| `title` | `string` | Task name from `SPEAKING_TASK_TITLES` |
| `description` | `string` | Short description from `SPEAKING_TASK_DESCRIPTIONS` |
| `prepTimeSecs` | `number` | Prep countdown duration |
| `responseTimeSecs` | `number` | Recording countdown duration |
| `difficulty` | `Difficulty` | `easy \| medium \| hard` |
| `hasParts` | `boolean?` | True for Task 5 (2-part response) |
| `promptCount` | `number` | Number of available prompts |
| `attemptsUsed` | `number` | DISTINCT prompts attempted (from quota) |
| `attemptsLimit` | `number \| null` | Plan limit; `null` = unlimited |
| `isBonusRetryMode` | `boolean` | Quota exhausted — infinite retries on used prompts |
| `isLocked` | `boolean` | True for Starter plan |
| `href` | `string` | Navigation target, e.g. `/speaking/3` |

### 3-Layer Card Structure
```
Layer 0 (absolute): gradient splash — top 80px, task-specific colour
Layer 1 (absolute): progress fill wash — left→right, width = fillPct%
Layer 2 (relative): content grid
    Row 1: task label badge + attempts chip (or lock icon)
    Row 2: Mic icon + task title
    Row 3: Prep time · Speak time meta row
    Row 4: Description (line-clamp-2, flex-1 pushes footer down)
    Row 5: Prompt count + ChevronRight (hidden when locked)
```

### `fillPct` Calculation
```typescript
fillPct = isLocked ? 0
        : isBonusRetryMode ? 100
        : attemptsLimit ? Math.min((used/limit) × 100, 100)
        : 0
```

### `TASK_META` Colour Map
Each task has a unique amber-spectrum gradient + fill colour for the progress
wash. Keys: `"practice"`, `"1"` through `"8"`.

### Locked State
- `opacity-60 cursor-not-allowed` on card
- Black/20 overlay at bottom with `Lock + "Requires Pro or Ultra"` pill
- No `<Link>` wrapper — bare div is rendered instead

---

## 3. `SpeakingPracticeSession.tsx` — Session Phase Router

**Type:** `"use client"`  
**Hook:** `useSpeakingAttempt()` — owns all state, timers, audio, upload logic

### Purpose
Top-level session orchestrator. Maps the current `phase` value from the
hook to the correct screen component. Intentionally **pure UI** — no business
logic.

### Phase → Screen Map

| Phase | Component rendered |
|-------|--------------------|
| `COUNTDOWN` | `CountdownOverlay` |
| `PREP` (Task 5 with options) | `Task5SelectionScreen` |
| `PREP` (all other tasks) | `PrepTimerScreen` |
| `RECORDING` (Task 5 curveball) | `Task5CurveballScreen` (isRecording=false) |
| `RECORDING` (other tasks) | `RecordingInterface` |
| `RECORDING_PART2` (Task 5) | `Task5CurveballScreen` (isRecording=true) |
| `RECORDING_PART2` (other) | `RecordingInterface` (Part 2 of 2) |
| `UPLOADING` | `UploadProgressBar` |
| `PROCESSING` | `ProcessingScreen` skill="speaking" |
| `IDLE` / `DONE` | Loading fallback (hook navigates away) |

### `key={phase}` Strategy
The wrapper `<div key={phase}>` causes a **full React subtree remount** on every
phase transition. This:
- Resets mic initialization state in `RecordingInterface`
- Triggers `animate-fade-in` CSS entry animation cleanly
- Trade-off: Task 5 RECORDING → RECORDING_PART2 re-requests mic permission

> ⚠️ **Do NOT remove** the `key` without verifying mic/audio state is safe to reuse.

### Lifecycle
```typescript
useEffect(() => {
  start(task);         // initialise session, timers, mic
  return () => { terminate(); };  // cleanup on unmount (back nav, tab close)
}, []);
```

### Exit Confirmation Modal
`ConfirmModal` is rendered **outside** the phase-keyed tree so it survives
phase transitions without being unmounted mid-dialog.

```
exitRequested = true → ConfirmModal opens
    → confirmExit() → session torn down, navigation back
    → cancelExit()  → modal closes, session continues
```

---

## 4. `PrepTimerScreen.tsx` — Preparation Phase Screen

**Type:** `"use client"`

### Purpose
Displays the prompt text (and optional image for Tasks 3/4/8) during the
preparation countdown. Contains the `TimerRing` SVG clock and task context.

### Props
`secondsLeft`, `totalPrepSeconds`, `totalResponseSeconds`, `promptText`,
`imageUrl?`, `taskNumber`, `taskTitle`

### Layout
- **Left panel (lg+):** `TimerRing` + seconds remaining + "Prepare your response" label
- **Right panel:** Prompt text + optional context image (blurred thumbnail on hover-off)
- **Bottom bar:** Response time preview → "Then you will speak for X seconds"

---

## 5. `RecordingInterface.tsx` — Recording Phase Screen

**Type:** `"use client"`

### Purpose
The active recording screen with `MicWaveform` visualiser, countdown timer,
and the active microphone indicator. Used for all tasks in RECORDING and
RECORDING_PART2 phases.

### Props
`secondsLeft`, `totalResponseSeconds`, `totalPrepSeconds`, `partLabel?`,
`imageUrl?`, `promptText`, `taskNumber`, `taskTitle`

### Key Sub-Components
- `MicWaveform` — canvas-based live audio level visualiser (Web Audio API)
- `TimerRing` — SVG countdown ring for response time
- `UploadProgressBar` — shown during UPLOADING phase

---

## 6. `Task5SelectionScreen.tsx` + `Task5CurveballScreen.tsx` — Task 5 Special Flow

### Task 5 is unique in two ways:
1. **PREP phase:** User sees 2 options and must choose one before recording
2. **RECORDING phase:** After choice is locked in, a "curveball" topic is revealed

#### `Task5SelectionScreen` Props
`secondsLeft`, `totalPrepSeconds`, `choiceOptions: string[]`, `selectedChoice`,
`onSelect`, `promptText`, `taskNumber`, `taskTitle`

#### `Task5CurveballScreen` Props
`secondsLeft`, `curveballOption`, `selectedChoice`, `curveballInstructionText`,
`isRecording: boolean`, `taskNumber`, `taskTitle`

`isRecording=false` → shown during curveball reveal (RECORDING phase, no mic active)  
`isRecording=true` → shown during Part 2 actual recording (RECORDING_PART2)

---

## 7. `CountdownOverlay.tsx` — 3-2-1 Session Start Overlay

**Type:** Client Component

Full-screen overlay with an animated "3 → 2 → 1 → Go!" countdown.
Blocks interaction until session officially starts. Transitions to PREP phase
automatically on countdown completion.

---

## 8. `UploadProgressBar.tsx` — Audio Upload Progress

**Type:** `"use client"`

### Props
`progress: number` (0–100)

Thin progress bar at the top of the screen during UPLOADING phase.
Shows percentage and "Uploading your recording…" label.

---

## 9. Key Hooks used by Speaking Components

| Hook | Purpose |
|------|---------|
| `useSpeakingAttempt()` | Full session state machine — phases, timers, audio recording, S3 upload |
| `useQuota("speaking")` | Fetches `speaking_used_per_task` from `/api/v1/users/me/quota` |
| `usePracticeSessionStore` | Zustand store — persists `selectedChoice` for Task 5 across phase transitions |

---

## 10. `lib/speaking-constants.ts` — Centralised Metadata

Single source of truth for task titles and descriptions used across
`SpeakingModuleHome`, `SpeakingTaskCard`, `SpeakingPracticeSession`,
and the admin panel.

```typescript
export const SPEAKING_TASK_TITLES: Record<number, string> = {
  0: "Practice Task",
  1: "Giving Advice",
  2: "Talking with a Stranger",
  3: "Describing a Scene",
  // ...
};

export function getSpeakingTaskTitle(taskNumber: number, fallback?: string): string
```
