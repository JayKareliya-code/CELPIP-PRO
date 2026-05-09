# CELPIP PRO — State Management

**Author:** Senior Web Developer  
**Location:** `apps/web/store/`  
**Library:** [Zustand](https://github.com/pmndrs/zustand) v4

---

## Overview

The frontend uses **two separate Zustand stores** for session-level state,
plus **React Query** for all server data. Zustand is used exclusively where
component-unmount-resilient, cross-component state is required during
time-critical exam sessions.

| Store | File | Scope |
|-------|------|-------|
| `usePracticeSessionStore` | `store/practiceSessionStore.ts` | Individual speaking/writing practice sessions |
| `useMockExamStore` | `store/mockExamStore.ts` | Full 8-task mock exam sessions |

> React Query handles all server data (user, quota, history, prompts, reports).
> Zustand handles only UI/session machine state that must survive component remounts.

---

## 1. `practiceSessionStore.ts` — Speaking Practice Session Store

**Export:** `usePracticeSessionStore`  
**Used by:** `useSpeakingAttempt()` hook (consumed by `SpeakingPracticeSession`)

### Phase State Machine

```
IDLE → COUNTDOWN → PREP → RECORDING → [RECORDING_PART2] → UPLOADING → PROCESSING → DONE
                                           ↑ Task 5 only
```

### `SessionPhase` type
```typescript
type SessionPhase =
  | "IDLE" | "COUNTDOWN" | "PREP" | "RECORDING"
  | "RECORDING_PART2" | "UPLOADING" | "PROCESSING" | "DONE";
```

### State Shape

| Field | Type | Description |
|-------|------|-------------|
| `task` | `SpeakingTask \| null` | Active task (null when IDLE) |
| `phase` | `SessionPhase` | Current phase |
| `secondsLeft` | `number` | Countdown for current timed phase |
| `uploadProgress` | `number` | 0–100 during UPLOADING |
| `attemptId` | `string \| null` | Set after API responds to upload |
| `recordingBlob` | `Blob \| null` | Raw `MediaRecorder` output |
| `selectedChoice` | `ChoiceOption \| null` | Task 5: user's selected option |

### Actions

| Action | Description |
|--------|-------------|
| `startSession(task)` | Sets task, enters COUNTDOWN, clears previous choice |
| `advancePhase()` | Computes `nextPhase(current, task)` → updates phase + secondsLeft |
| `tick()` | `secondsLeft = Math.max(0, secondsLeft - 1)` |
| `setUploadProgress(pct)` | Clamped 0–100 |
| `setAttemptId(id)` | Stores API-returned attempt ID |
| `setRecordingBlob(blob)` | Stores raw audio blob |
| `setSelectedChoice(choice)` | Task 5 option selection |
| `reset()` | Restores `INITIAL_STATE` (all fields zeroed/null) |

### `nextPhase(current, task)` Logic

```
COUNTDOWN           → PREP
PREP                → RECORDING
RECORDING           → RECORDING_PART2  (if task.has_parts)
RECORDING           → UPLOADING        (all other tasks)
RECORDING_PART2     → UPLOADING
UPLOADING           → PROCESSING
PROCESSING          → DONE
```

### `secondsForPhase(phase, task)` Logic

```
PREP / RECORDING / RECORDING_PART2 → task.prep_time_seconds / task.response_time_seconds
all other phases                   → 0 (no countdown)
```

### Design Rules
- Components **NEVER** manage their own `setInterval` — all timer ticks
  are driven by `useSpeakingAttempt()`'s single interval, which calls `tick()`
- `selectedChoice` is always cleared on `startSession()` to prevent
  previous Task 5 selections bleeding into new sessions
- `recordingBlob` is stored here (not component state) so the hook can
  access it from the `useEffect` cleanup after component unmount

---

## 2. `mockExamStore.ts` — Full Mock Exam Store

**Export:** `useMockExamStore`  
**Used by:** `useMockExamSession()` hook (consumed by `MockExamShell`)

### Phase State Machine

```
IDLE → LOADING → READY → TASK_COUNTDOWN → TASK_PREP
               → TASK_RECORDING → [TASK_RECORDING_PART2]
               → TASK_UPLOADING → INTER_TASK_BREAK
               → (loop: TASK_COUNTDOWN for next task)
               → COMPLETE | ERROR
```

### `MockExamPhase` type
```typescript
type MockExamPhase =
  | "IDLE" | "LOADING" | "READY"
  | "TASK_COUNTDOWN" | "TASK_PREP"
  | "TASK_RECORDING" | "TASK_RECORDING_PART2"
  | "TASK_UPLOADING" | "INTER_TASK_BREAK"
  | "COMPLETE" | "ERROR";
```

### State Shape

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `MockExamPhase` | Current exam phase |
| `tasks` | `MockExamTask[]` | All 8 task slots (populated after LOADING) |
| `currentIndex` | `number` | 0-based index of active task |
| `examSessionId` | `string` | Stable UUID — S3 folder key + quota dedup |
| `secondsLeft` | `number` | Active task's phase countdown |
| `breakSecondsLeft` | `number` | INTER_TASK_BREAK countdown |
| `uploadProgress` | `number` | 0–100 during TASK_UPLOADING |
| `recordingBlob` | `Blob \| null` | Raw audio for the current task |
| `selectedChoice` | `ChoiceOption \| null` | Task 5 user choice |
| `errorMessage` | `string \| null` | Set when phase === "ERROR" |

### Actions

| Action | Description |
|--------|-------------|
| `beginLoading(slotNumber)` | Restores or generates `examSessionId`, enters LOADING |
| `loadExam(prompts)` | Builds task slots, enters READY |
| `startExam()` | Marks task 0 as active, enters TASK_COUNTDOWN |
| `advanceTaskPhase()` | Moves within a single task's phase sequence |
| `finishTaskUpload(attemptId)` | Marks current task done, saves attempt ID, enters INTER_TASK_BREAK |
| `advanceToNextTask()` | Moves to next task's TASK_COUNTDOWN (or COMPLETE if all done) |
| `tickTask()` | Decrements `secondsLeft` by 1 |
| `tickBreak()` | Decrements `breakSecondsLeft` by 1 |
| `setUploadProgress(pct)` | 0–100 |
| `setRecordingBlob(blob)` | Raw audio blob |
| `setSelectedChoice(choice)` | Task 5 selection |
| `setTaskError()` | Marks current task as `status: "error"` |
| `setTaskBand(taskNumber, band)` | Stores scored band after background scoring |
| `setError(message)` | Enters ERROR phase with message |
| `reset()` | Restores INITIAL state |

### `nextTaskPhase(current, prompt)` Logic

```
TASK_COUNTDOWN → TASK_PREP
TASK_PREP      → TASK_RECORDING
TASK_RECORDING (Task 5 + curveball) → TASK_RECORDING_PART2
TASK_RECORDING (has_parts, other)   → TASK_RECORDING_PART2
TASK_RECORDING (standard)           → TASK_UPLOADING
TASK_RECORDING_PART2                → TASK_UPLOADING
```

### Session UUID Stabilisation (`beginLoading`)

The most critical design in this store. Prevents quota inflation on retakes.

```
localStorage key: "celpip-mock-session-speaking-{slotNumber}"

1. Read stored UUID from localStorage
2. If found → reuse it (retake scenario — same slot, same UUID)
3. If not found → crypto.randomUUID() → write to localStorage
4. Set store.examSessionId = UUID
```

This means `COUNT(DISTINCT session_id)` on the backend always returns the
same count for the same user + slot, regardless of how many times they
navigate away and re-enter.

Fallback UUID generator for environments without `crypto.randomUUID()`:
```typescript
"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ...)
```

> ⚠️ **Never call `reset()` before reading `examSessionId`** — use `beginLoading(slot)`
> which preserves the UUID from localStorage before clearing other state.

### `MockExamTask` Shape
```typescript
interface MockExamTask {
  taskNumber:    number;
  prompt:        MockExamPrompt;
  attemptId:     string | null;    // set after finishTaskUpload()
  estimatedBand: number | null;    // set after setTaskBand()
  status:        "pending" | "active" | "done" | "error";
}
```

---

## 3. React Query — Server State

All server data is managed by **React Query v5** via custom hooks.
The `QueryClient` is configured in `Providers.tsx`.

### Query Key Conventions

| Key | Data source | Staleness |
|-----|-------------|-----------|
| `["currentUser"]` | `GET /users/me` | 5 min |
| `["quota", skill]` | `GET /users/me/quota` | 30s |
| `["history", skill, page]` | `GET /attempts` | 1 min |
| `["report", attemptId]` | `GET /attempts/{id}/report` | `Infinity` (immutable) |
| `["progressData", skill]` | `GET /progress` | 2 min |
| `["adminPrompts", "speaking"]` | `GET /admin/prompts/speaking` | 30s |
| `["billing"]` | `GET /billing/status` | 1 min |
| `["practiceQuota"]` | `GET /users/me/quota` | 30s |

### Cache Invalidation Strategy
- **Post-mutation:** Each mutation hook calls `queryClient.invalidateQueries(key)`
  on success — triggers background refetch
- **Post-payment:** `refreshAfterPayment()` invalidates `["billing", "currentUser"]`
- **Post-exam:** `MockExamShell` invalidates `["practiceQuota"]` on `phase === "COMPLETE"`
- **AuthCacheGuard:** Wipes ALL cached queries on `userId` change (cross-user isolation)

---

## 4. `Providers.tsx` — Client-Side Context Tree

```tsx
<ClerkProvider>
  <QueryClientProvider client={queryClient}>
    <AuthCacheGuard />           ← wipes cache on user switch
    <PlanEventsWatcher />        ← SSE plan-upgrade listener
    {children}
    <Toaster />                  ← sonner toast container
  </QueryClientProvider>
</ClerkProvider>
```

### `PlanEventsWatcher`
Subscribes to `GET /api/v1/billing/events` (SSE stream). On `plan_updated`
event → invalidates `["currentUser"]` and `["billing"]`.

Fallback: `SuccessHandler` on the billing page polls `GET /billing/status`
every 5s (max 3×) when SSE is blocked by a corporate proxy.

---

## 5. State Isolation Rules

| Rule | Reason |
|------|--------|
| `practiceSessionStore` is never used by `MockExamShell` | Prevents mock exam state leaking into practice flows |
| `mockExamStore` is never used by `SpeakingPracticeSession` | Prevents practice state leaking into mock exams |
| React Query `Infinity` staleTime for reports | Report data is immutable — re-fetching wastes quota |
| `AuthCacheGuard` wipes React Query cache on userId change | Prevents cross-user data leakage in shared-device scenarios |
| `examSessionId` persisted to `localStorage` | Prevents quota inflation from retakes |
| `selectedChoice` cleared in `startSession()` | Prevents Task 5 choice from a prior session bleeding in |
