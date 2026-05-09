# CELPIP PRO — Mock Exam Components

**Author:** Senior Web Developer  
**Location:** `apps/web/components/exam/`  
**Route group:** `app/(main)/exam/[slot]/page.tsx`  
**State management:** `useMockExamSession` (Zustand-backed hook) + `mockExamStore.ts`

---

## 1. `MockExamShell.tsx` — Top-Level Exam Phase Router

**Type:** `"use client"`  
**Hooks:** `useMockExamSession()`, `useMockExamPrompts(slotNumber)`, `useQueryClient()`

### Purpose
The root component of the full mock exam experience. Owns all phase routing,
renders the `MockExamInfoBar`, and manages the exam lifecycle from prompt
loading through task completion.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `slotNumber` | `number` | Exam slot (1, 2, …) from URL param — used to stabilise session UUID |

### Slot-Stabilised Session UUID
The `slotNumber` is passed to `initExam(prompts, slotNumber)` which seeds the
Zustand store with a stable `session_id`. This means re-entering Exam Slot 1
always reuses the same `session_id`, preventing quota inflation on retakes.
See `mockExamStore.ts` for the full UUID derivation.

### Phase → Screen Map

| Phase | Screen rendered |
|-------|----------------|
| `IDLE` / `LOADING` / `promptsLoading` | `ExamLoadingScreen` |
| `READY` | `ExamIntroScreen` |
| `TASK_COUNTDOWN` | `CountdownOverlay` (reused from speaking/) |
| `TASK_PREP` (Task 5 w/ options) | `Task5SelectionScreen` |
| `TASK_PREP` (other) | `PrepTimerScreen` |
| `TASK_RECORDING` (Task 5 curveball) | `Task5CurveballScreen` (isRecording=false) |
| `TASK_RECORDING` (other) | `RecordingInterface` |
| `TASK_RECORDING_PART2` (Task 5) | `Task5CurveballScreen` (isRecording=true) |
| `TASK_RECORDING_PART2` (other) | `RecordingInterface` (Part 2 of 2) |
| `TASK_UPLOADING` | `UploadProgressBar` |
| `INTER_TASK_BREAK` | `InterTaskBreakScreen` |
| `COMPLETE` | `ExamCompleteScreen` |
| `ERROR` | Inline error panel |
| Prompt fetch 404 | "Coming Soon" slot panel |

### `withNoInfoBar` Helper
```typescript
function withNoInfoBar(element: React.ReactElement): React.ReactElement {
  return cloneElement(element, { showInfoBar: false });
}
```
All child screens that accept `showInfoBar` have it suppressed — the exam
shell renders one single `MockExamInfoBar` at the top level. This prevents
double info bars.

### `showMockBar` Conditions
`MockExamInfoBar` is rendered only when:
- `tasks.length > 0`
- Phase is not `IDLE`, `LOADING`, `READY`, `COMPLETE`, or `ERROR`

### Exit Button
Fixed `top-4 right-4 z-[60]` — visible in all phases except `UPLOADING`,
`COMPLETE`, `IDLE`, `LOADING`. Calls `exit()` from the session hook.

**ID:** `#exam-exit-btn`

### Lifecycle Effects
```
Mount  → nothing (no autostart)
prompts resolve → initExam(prompts, slotNumber) (once, when phase is IDLE/LOADING)
phase = COMPLETE → invalidate ["practiceQuota"] so history updates immediately
Unmount → terminate() — stops mic, resets store
```

### `key={phase}` remount strategy
Same pattern as `SpeakingPracticeSession` — full subtree remount on phase
change, ensures clean mic state and fresh CSS animations.

---

## 2. `ExamIntroScreen.tsx` — Pre-Exam Overview

**Type:** `"use client"` (has `onStart` callback)

### Purpose
Shown in the `READY` phase. Presents a structured overview of all 8 tasks
before the exam starts.

### Props
`onStart: () => void` — calls `startExam()` from the session hook

### Content
- **Hero:** Mic icon, "CELPIP Speaking Test", `~25 minutes total`, `8 recorded tasks`
- **Task list:** `grid-cols-1 sm:grid-cols-2` — all 8 tasks with label, description, duration
- **Warning card:** "Once you begin, the exam runs continuously with 30-second breaks…"
- **CTA button:** "Begin Exam →" (`id="begin-exam-btn"`)

### `TASK_META` (local constant)

| Task | Label | Duration |
|------|-------|----------|
| 1 | Giving Advice | 1m 30s |
| 2 | Talking about a Personal Experience | 1m |
| 3 | Describing a Scene | 1m |
| 4 | Making Predictions | 1m |
| 5 | Comparing and Persuading | 2m |
| 6 | Dealing with a Difficult Situation | 1m |
| 7 | Expressing Opinions | 1m 30s |
| 8 | Describing an Unusual Situation | 1m |

---

## 3. `ExamProgressRail.tsx` — Fixed Task Progress Strip

**Type:** `"use client"`  
**Position:** `fixed top-0` — rendered inside `MockExamInfoBar`

### Purpose
A sticky top bar visible throughout the exam (except READY and COMPLETE).
Shows all 8 tasks as status pills.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `tasks` | `MockExamTask[]` | All exam tasks with status |
| `currentTaskIndex` | `number` | Zero-based index of active task |

### Task Pill States

| State | Visual |
|-------|--------|
| Pending | Grey circle dot + `white/30` text |
| Active | Amber pulsing dot + amber glow shadow |
| Done | `CheckCircle2` icon + emerald colours |
| Error | `AlertCircle` icon + red colours |

Right-side: `"Task N — [ShortLabel]"` (desktop only) + `"N / 8"` counter badge.

---

## 4. `MockExamInfoBar.tsx` — Sticky Exam Header Bar

**Type:** `"use client"`

### Purpose
Combined sticky bar rendered at the top of the exam shell during active task
phases. Contains the `ExamProgressRail` and a recording status indicator with
a live seconds countdown when `isRecording = true`.

### Props
`tasks`, `currentTaskIndex`, `taskTitle`, `prepSeconds`, `responseSeconds`,
`isRecording`, `secondsLeft?`, `partLabel?`

---

## 5. `InterTaskBreakScreen.tsx` — 30-Second Break Between Tasks

**Type:** `"use client"` (renders live `breakSecondsLeft`)

### Purpose
Full-screen break screen shown in the `INTER_TASK_BREAK` phase. Auto-advances
to the next task when timer reaches 0.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `completedTask` | `MockExamTask` | Just-completed task |
| `nextTask` | `MockExamTask \| null` | Next task (null after final task) |
| `breakSecondsLeft` | `number` | Countdown from `MOCK_EXAM_BREAK_SECONDS` (30s) |

### Layout (top-to-bottom)
1. **Completed badge:** `"Task N Complete ✓"` in emerald pill
2. **`TimerRing` + `TimerDisplay`** — 144px ring, live countdown overlay
3. **Next task preview card:** Task number, full label, prep time
4. **Coaching tip** from `NEXT_TASK_TIPS[nextTask.taskNumber]`
5. **Auto-advance note:** `"Next task begins automatically when the timer reaches 0."`

### `NEXT_TASK_TIPS`
Per-task coaching tips shown during the break before that task. Examples:
- Task 1: *"Give specific, actionable advice. Use phrases like 'I would suggest that you…'"*
- Task 7: *"State your opinion clearly in the first sentence. Support with two reasons…"*

---

## 6. `ExamCompleteScreen.tsx` — Exam Completion Screen

**Type:** `"use client"`  
**Route transition:** Links to `/attempts/{id}/report` for each completed task

### Purpose
Shown in the `COMPLETE` phase. Celebrates exam completion, shows a summary
of all 8 task upload statuses, and links to individual attempt reports.

### Props
`tasks: MockExamTask[]`, `sessionId: string`

### Content
- **Header:** Trophy icon + "Exam Complete!" heading + session ID
- **Task summary list:** Each task shows status (`done` ✓ / `error` ✗) + "View Report" link
- **CTA:** "Back to Practice" link

---

## 7. `ExamLoadingScreen.tsx` — Prompt Fetch Loading

**Type:** Server Component

### Purpose
Minimal loading screen shown while `useMockExamPrompts()` is fetching exam
prompts. Spinner + "Loading your exam…" copy.

---

## Key Hooks: Mock Exam

| Hook | Purpose |
|------|---------|
| `useMockExamSession()` | Full session state machine — all phases, timers, task sequencing, upload |
| `useMockExamPrompts(slotNumber)` | Fetches `GET /api/v1/practice/speaking/mock?slot={n}` |

### `useMockExamSession` State Exposed

| Value | Description |
|-------|-------------|
| `phase` | Full exam phase state machine |
| `tasks` | `MockExamTask[]` — populated after `initExam()` |
| `currentTask` | Active task object |
| `currentTaskIndex` | Zero-based active task index |
| `secondsLeft` | Active task's countdown |
| `breakSecondsLeft` | Break countdown (30s) |
| `uploadProgress` | 0–100 during `TASK_UPLOADING` |
| `selectedChoice` | Task 5 choice state |
| `uploadError` | String on upload failure |
| `examSessionId` | Stable UUID for this slot |
| `initExam(prompts, slot)` | Seeds store with prompts + stable UUID |
| `startExam()` | Transitions READY → TASK_COUNTDOWN |
| `selectChoice(c)` | Sets Task 5 selected option |
| `exit()` | Exits exam, navigates back |
| `terminate()` | Cleanup on unmount |
