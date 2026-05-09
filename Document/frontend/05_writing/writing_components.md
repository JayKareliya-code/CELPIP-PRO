# CELPIP PRO — Writing Components

**Author:** Senior Web Developer  
**Location:** `apps/web/components/writing/`  
**Route group:** `app/(main)/writing/`

---

## 1. `WritingModuleHome.tsx` — Module Landing Page

**Type:** `"use client"`  
**Input props:** `tasks: WritingTask[]`  
**Data hooks:** `useCurrentUser()`, `useQuota("writing")`

### Purpose
The `/writing` route page. Identical structure to `SpeakingModuleHome`:
header strip → Starter upgrade banner → 3-stat strip → task card grid.

### Key Differences from SpeakingModuleHome
- Only 2 tasks (Task 1 & Task 2) — no `promptCountByTask` grouping needed
- Delegates the task grid to `WritingTaskGrid` (separate component)
- `attemptsLimit` pulls from `PRO_PLAN_LIMITS.writing_attempts_per_task`

### `WritingTaskGrid` Props passed through

| Prop | Source |
|------|--------|
| `tasks` | RSC server prop |
| `writingUsedPerTask` | `useQuota("writing").writing_used_per_task` |
| `attemptsLimit` | Plan-derived (`PRO_PLAN_LIMITS` or `ULTRA_PLAN_LIMITS`) |
| `isLocked` | `plan === "starter"` |

### Starter Banner
Identical amber gradient design to the speaking module. `"Upgrade →"` routes to `/billing`.

### Stats Strip (Pro/Ultra only)
3-cell grid: **Tasks: 2** | **Attempts/task: N** | **Bonus retries: Unlimited**

---

## 2. `WritingTaskGrid.tsx` — Task Card Grid

**Type:** `"use client"`  
**Renders:** One `WritingTaskCard` per task in `tasks[]`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `tasks` | `WritingTask[]` | All active writing tasks from DB |
| `writingUsedPerTask` | `Record<number, number> \| null` | Quota usage per task |
| `attemptsLimit` | `number \| null` | Per-plan attempt limit |
| `isLocked` | `boolean` | True for Starter plan |

### Layout
`grid-cols-1 sm:grid-cols-2 gap-4`

---

## 3. `WritingTaskCard.tsx` — Writing Task Selection Card

**Type:** `"use client"`

### Purpose
Mirrors `SpeakingTaskCard` structure exactly. Same 3-layer design (gradient
splash, progress fill wash, content grid). Adapted for writing-specific
metadata.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `taskNumber` | `1 \| 2` | Writing Task 1 (email) or Task 2 (opinion) |
| `title` | `string` | Task display name |
| `description` | `string` | Brief task description |
| `timeLimitSeconds` | `number` | Total writing time (e.g. 1620s = 27min) |
| `minWords` | `number` | Min word count guideline |
| `maxWords` | `number` | Max word count guideline |
| `difficulty` | `Difficulty` | |
| `promptCount` | `number` | Available prompts |
| `attemptsUsed` | `number` | DISTINCT prompts attempted |
| `attemptsLimit` | `number \| null` | |
| `isBonusRetryMode` | `boolean` | |
| `isLocked` | `boolean` | |
| `href` | `string` | e.g. `/writing/1` |

### Differences from SpeakingTaskCard
- Icon: `PenLine` instead of `Mic`
- Meta row: shows `Time limit` (formatted) + `Words: min–max` instead of prep/speak times
- Colour palette: `success/emerald` theme instead of amber

### Lock Behaviour
Same as SpeakingTaskCard — locked cards render a `div` (not `<Link>`), show
a lock overlay pill.

---

## 4. `WritingPracticeSession.tsx` — Session Phase Router

**Type:** `"use client"`  
**Hook:** `useWritingAttempt()`

### Purpose
Top-level writing session shell. Maps phase → screen. Intentionally
**pure UI** — no business logic.

### Phase → Screen Map

| Phase | Screen |
|-------|--------|
| `COUNTDOWN` | `CountdownOverlay` |
| `WRITING` | Full writing layout (header + prompt + editor + word counter + submit) |
| `SUBMITTING` | `ProcessingScreen skill="writing"` |
| `PROCESSING` | `ProcessingScreen skill="writing"` |
| `IDLE` / `DONE` | Loading fallback (hook navigates away) |

### WRITING Phase Layout
```
┌─────────────────────────────────────────────────┐
│  WritingSessionHeader  (sticky top bar)         │
│  Task N — Title              | MM:SS countdown  │
└─────────────────────────────────────────────────┘
  WritingPromptBox         ← read-only prompt text
  WritingEditor            ← contenteditable + toolbar
  ─────────────────────────────────────────────────
  [X words written]           [Submit →]
```

### Draft Key
`draftKey = "task-{task.id}"` — each task has its own `sessionStorage` slot.
`clearDraft(draftKey)` is called on submit to wipe the slot for the next attempt.

### Submit Error Banner
Shown when `submitError` is truthy (network failure, server error). Preserves
the written content — user can retry submission without losing work.

### Lifecycle
```typescript
useEffect(() => {
  start(task);
  return () => { terminate(); };
}, []);
```

---

## 5. `WritingEditor.tsx` — Contenteditable Writing Area

**Type:** `"use client"` — ref-based DOM manipulation  
**Element ID:** `#writing-editor`

### Purpose
The primary writing input. Uses a native `contenteditable` `<div>` (not
Tiptap/ProseMirror) to achieve native browser spell check.

### Why `contenteditable` and not a `<textarea>` or Tiptap
- **Tiptap/ProseMirror** hard-codes `spellcheck=false` in their shadow DOM
- **`<textarea>`** cannot host HTML decorations or rich paste handling
- **Native `contenteditable`** + `spellcheck` attribute = browser spell check works natively

### Props

| Prop | Type | Description |
|------|------|-------------|
| `onUpdate` | `(html, plainText) => void` | Fired on every keystroke — used for word count + submission |
| `editable` | `boolean?` | `false` locks editor during `SUBMITTING` phase |
| `sessionKey` | `string?` | `sessionStorage` key for draft persistence (e.g. `"task-uuid"`) |
| `className?` | `string` | |

### Draft Persistence
```typescript
// On every keystroke:
sessionStorage.setItem("celpip-writing-draft-" + sessionKey, el.innerHTML)

// On mount:
el.innerHTML = sessionStorage.getItem("celpip-writing-draft-" + sessionKey) ?? ""
```
Page refreshes do NOT lose work. Draft is cleared by calling `clearDraft(key)`
(exported function) after successful submit.

### Paste Handling (W3C Standard)
Uses the **Selection/Range API** — not the deprecated `document.execCommand("insertText")`:
```
1. e.preventDefault()
2. Extract text/plain from clipboardData
3. range.deleteContents()
4. range.insertNode(textNode)
5. Collapse cursor to after inserted node
6. Sync onUpdate + save draft
```

### Spell-Check Banner
- Shown **once per browser session** (sessionStorage `"celpip-sc-dismissed"` key)
- Includes a browser-specific help link (Chrome/Firefox/Edge detection via `navigator.userAgent`)
- Cannot reliably detect if the browser's spell checker is actually ON — banner
  is proactive

### Anti-Grammarly Attributes
```html
data-gramm="false"
data-gramm_editor="false"
data-enable-grammarly="false"
```
Prevents third-party browser extensions from injecting their own UI into the editor.

### `WritingToolbar` (child)
Inline formatting toolbar rendered above the editing area. Provides Bold,
Italic, and Underline buttons that operate on the current selection via
`editorRef` forwarding.

---

## 6. `WritingSessionHeader.tsx` — Sticky Timer Header Bar

**Type:** `"use client"` (renders live countdown)

### Purpose
Sticky top bar during the `WRITING` phase. Displays task number, task title,
and a live MM:SS countdown timer with a colour-coded background:

| Time remaining | Bar colour |
|----------------|-----------|
| > 50% | Green / success |
| 25–50% | Amber / warning |
| < 25% | Red / destructive |
| Expired | Red + "Time's up" |

### Props
`taskNumber: number`, `timeLimitSeconds: number`, `secondsLeft: number`

---

## 7. `WritingPromptBox.tsx` — Read-Only Prompt Display

**Type:** Server Component

### Purpose
Displays the writing prompt text in a styled read-only card. Shown above the
editor as a permanent reference. `opacity-80` during the session so the
editor area commands visual focus.

### Props
`promptText: string`, `className?: string`

---

## 8. `WordCounter.tsx` — Live Word Count Indicator

**Type:** Server Component (receives computed count as prop)

### Purpose
Displays the current word count with colour-coded min/max guidance.

| Condition | Colour | Label |
|-----------|--------|-------|
| Below `minWords` | `destructive` | `"X words — aim for {min}+"` |
| Within range | `success` | `"X words"` |
| Above `maxWords` | `warning` | `"X words — over suggested limit"` |

### Props
`count: number`, `minWords: number`, `maxWords: number`

---

## 9. `SubmitWritingButton.tsx` — Submit CTA

**Type:** `"use client"`

Primary submit button below the writing editor. Disabled when `wordCount === 0`.
Shows `Loader2` spinner during `isPending`.

### Props
`onSubmit: () => void`, `disabled: boolean`

---

## 10. Key Hooks used by Writing Components

| Hook | Purpose |
|------|---------|
| `useWritingAttempt()` | Full session state machine — phases, countdown timer, essay state, submission |
| `useQuota("writing")` | Fetches `writing_used_per_task` from `/api/v1/users/me/quota` |

### `useWritingAttempt` State Exposed

| Value | Description |
|-------|-------------|
| `phase` | `IDLE \| COUNTDOWN \| WRITING \| SUBMITTING \| PROCESSING \| DONE` |
| `secondsLeft` | Live countdown in seconds |
| `wordCount` | Computed from `plainText` on every `onUpdate` call |
| `submitError` | Error string from failed submission |
| `start(task)` | Initialises session with the given task |
| `setContent(html, plainText)` | Called by `WritingEditor.onUpdate` |
| `submit()` | Posts essay to API, transitions to SUBMITTING |
| `terminate()` | Cleanup — called on unmount |

### Auto-Submit on Timer Expiry
When `secondsLeft` reaches 0 during the `WRITING` phase, the hook
automatically calls `submit()` with `auto_submitted: true`. This mirrors
the real CELPIP exam's time-up behaviour.
