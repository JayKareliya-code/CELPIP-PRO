# CELPIP PRO — Admin Panel Components

**Author:** Senior Web Developer  
**Location:** `apps/web/components/admin/`  
**Route group:** `app/(admin)/` — protected by Clerk + `admin` role middleware  
**Access:** Admin users only — enforced server-side in layout

---

## 1. `AdminSidebar.tsx` — Admin Navigation

**Type:** `"use client"` — uses `usePathname()` for active state

### Purpose
Vertical navigation sidebar for all admin pages. Hidden on mobile (`hidden lg:flex`).

### Nav Items

| Route | Label | Icon |
|-------|-------|------|
| `/admin` | Overview | `LayoutDashboard` |
| `/admin/prompts` | Prompts | `BookCopy` |
| `/admin/materials` | Materials | `BookOpen` |
| `/admin/assets` | Assets | `Image` |
| `/admin/tags` | Tags | `Tag` |
| `/admin/calibration` | Calibration | `Sliders` |
| `/admin/audit` | Audit Log | `ClipboardList` |
| `/admin/cost-report` | Cost Report | `DollarSign` |

### Active Detection
```typescript
isActive = href === ROUTES.admin
  ? pathname === ROUTES.admin        // exact match for root
  : pathname.startsWith(href)        // prefix match for nested routes
```

Active item: `bg-primary/10 text-primary` + `ChevronRight` trailing icon.  
`aria-current="page"` set on the active link.

---

## 2. `AdminPromptTabs.tsx` — Speaking / Writing Prompt Tab Switcher

**Type:** `"use client"`

### Purpose
Tab switcher at `/admin/prompts`. Routes between `SpeakingTaskGrid` and
`WritingAdminTaskGrid`. Each table is self-fetching — no props passed.

### Tab Rendering
Conditionally mounts the tab content (not hidden with CSS) so network
requests only fire when the tab is opened:
```
active === "speaking" → mount SpeakingTaskGrid
active === "writing"  → mount WritingAdminTaskGrid
```

Full ARIA tab pattern: `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`, `aria-controls`.

---

## 3. `AdminSpeakingTaskDetail.tsx` — Speaking Prompt Management Orchestrator

**Type:** `"use client"`  
**Props:** `taskNumber: number`  
**Route:** `/admin/prompts/speaking/[task]`

### Purpose
Thin orchestrator for a single speaking task's prompt library. Composes:
- `SpeakingTaskHeader` — page header + "Add Prompt" button
- `PromptTableToolbar` — client-side filter controls
- `SpeakingPromptsTable` — data table with action buttons
- `PromptFormModal` — create/edit prompt form
- `ConfirmModal` — delete confirmation

### Filter State (all client-side, no API calls)
```typescript
search:       string        // text search on title + prompt_text
statusFilter: StatusFilter  // "all" | "draft" | "published" | "archived"
activeFilter: ActiveFilter  // "all" | "active" | "inactive"
poolFilter:   PoolFilter    // "all" | "practice" | "mock"
```

Prompts are fetched once (`useAdminSpeakingPrompts()`), filtered in-memory with `useMemo`.

### `toPayload(data: FormData, taskNumber)` Helper
Converts the form's `FormData` into a `SpeakingPromptPayload`. Handles:
- **Task 5 special fields:** Parses hidden inputs (`choice_option_a`, `choice_option_b`,
  `curveball_option`) from JSON strings serialized by the `OptionEditor` sub-component
- **Auto-title:** If title is blank, uses the first 60 chars of `prompt_text`
- **`exam_slot`:** Parses to `number | null` (required for prompt isolation in mock exams)
- **`prompt_tag`:** `"practice"` | `"mock"` — routes prompt to correct pool

### `promptHasChanges(payload, original)` Helper
Performs field-by-field dirty check before PATCH. Avoids saving no-op edits.
Special handling:
- `context_image_url` — strips query params before comparing (S3 signed URLs change)
- `choice_options` / `curveball_option` — JSON-stringified for deep comparison

### Mutation Hooks Used

| Hook | Operation |
|------|-----------|
| `useAdminSpeakingPrompts()` | `GET /admin/prompts/speaking` |
| `useCreateSpeakingPrompt()` | `POST /admin/prompts/speaking` |
| `useUpdateSpeakingPrompt()` | `PATCH /admin/prompts/speaking/{id}` |
| `useDeleteSpeakingPrompt()` | `DELETE /admin/prompts/speaking/{id}` |
| `usePublishSpeakingPrompt()` | `POST /admin/prompts/speaking/{id}/publish` |
| `useArchiveSpeakingPrompt()` | `POST /admin/prompts/speaking/{id}/archive` |
| `useToggleActiveSpeakingPrompt()` | `PATCH /admin/prompts/speaking/{id}` `{is_active}` |

`isMutating` = OR of all `isPending` states — disables the table action buttons
globally while any mutation is in flight.

### Empty vs Filter-Empty States
- `prompts.length === 0` → "No prompts for Task N yet" + "Add First Prompt" button
- `filteredPrompts.length === 0` → "No prompts match your current filters" + "Clear filters"

---

## 4. `AdminWritingTaskDetail.tsx` — Writing Prompt Management Orchestrator

**Type:** `"use client"`  
**Props:** `taskNumber: 1 | 2`  
**Route:** `/admin/prompts/writing/[task]`

### Purpose
Same pattern as `AdminSpeakingTaskDetail` but for writing prompts.
Composes `WritingTaskHeader` + `WritingPromptTable` + `PromptFormModal` + `ConfirmModal`.

Key differences from speaking:
- No `choice_options`, `curveball_option`, or `exam_slot` fields
- `toWritingPayload()` builds `WritingPromptPayload` with `min_words`, `max_words`, `time_limit_seconds`

---

## 5. `SpeakingPromptsTable` / `WritingPromptTable` — Admin Prompt Data Tables

**Type:** `"use client"`  
**Location:** `admin/speaking/SpeakingPromptsTable.tsx`, `WritingPromptTable.tsx`

### Purpose
Full-width data tables for managing prompts. Each row shows prompt metadata
and an inline action menu.

### Speaking Table Columns
`#` | `Title` | `Status` | `Pool` | `Active` | `Slot` | `Difficulty` | `Actions`

### Action Menu (per row)
- `Edit` → opens `PromptFormModal` pre-filled
- `Publish` → `status: draft → published`
- `Archive` → `status: published/draft → archived`
- `Toggle Active` → `is_active` flip
- `Delete` → opens `ConfirmModal`

### Status Badges
- `draft` → grey pill
- `published` → green pill
- `archived` → amber/warning pill

---

## 6. `PromptFormModal.tsx` — Create / Edit Prompt Form

**Type:** `"use client"`  
**Pattern:** Controlled `<dialog>` / `<Modal>` wrapper with `FormData` submission

### Purpose
Shared modal for creating and editing both speaking and writing prompts.
Uses native `<form>` — submits `FormData` to the `onSave` callback.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | |
| `skill` | `"speaking" \| "writing"` | Controls which fields render |
| `initialPrompt` | `SpeakingPrompt \| WritingPrompt \| undefined` | Pre-fills for edit |
| `onClose` | `() => void` | |
| `onSave` | `(data: FormData) => void` | |
| `isSaving` | `boolean` | Shows spinner on submit button |
| `lockedTaskNumber` | `number` | Task number field — read-only in edit mode |

---

## 7. `PromptTableToolbar` — Filter Controls

**Location:** `admin/shared/PromptTableToolbar.tsx`

### Purpose
Row of filter controls above the prompt tables:
- **Text search** input
- **Status** dropdown (`all / draft / published / archived`)
- **Active** toggle (`all / active / inactive`)
- **Pool** dropdown (`all / practice / mock`)
- **Count badge:** `"Showing N of M prompts"`
- **"Clear filters"** button (shown when any filter is active)

---

## 8. `SpeakingTaskGrid` / `WritingAdminTaskGrid` — Task Selection Grid

### Purpose
Grid of task tiles at `/admin/prompts`. Each tile links to the task detail
page and shows a summary count of prompts.

---

## 9. Admin Calibration Components

### `CalibrationSampleForm.tsx`
Form for submitting a manually-scored calibration sample (used to baseline AI scoring).

### `CalibrationSampleTable.tsx`
Table of existing calibration samples with scores and metadata.

### `PromptAnchorTable.tsx`
Table of anchor examples — model answers with reference band scores used
to anchor the AI scorer's outputs.

### `AnchorEditModal.tsx`
Modal form for creating/editing anchor examples (text + band score + dimension scores).

---

## Admin API Routes

```
GET    /api/v1/admin/prompts/speaking              → SpeakingPrompt[]
POST   /api/v1/admin/prompts/speaking              → create prompt
PATCH  /api/v1/admin/prompts/speaking/{id}         → update prompt
DELETE /api/v1/admin/prompts/speaking/{id}         → hard delete
POST   /api/v1/admin/prompts/speaking/{id}/publish → status → "published"
POST   /api/v1/admin/prompts/speaking/{id}/archive → status → "archived"

GET    /api/v1/admin/prompts/writing               → WritingPrompt[]
POST   /api/v1/admin/prompts/writing               → create
PATCH  /api/v1/admin/prompts/writing/{id}          → update
DELETE /api/v1/admin/prompts/writing/{id}          → delete

GET    /api/v1/admin/calibration/samples           → CalibrationSample[]
POST   /api/v1/admin/calibration/samples           → submit sample
GET    /api/v1/admin/calibration/anchors           → AnchorExample[]
POST   /api/v1/admin/calibration/anchors           → create anchor
PATCH  /api/v1/admin/calibration/anchors/{id}      → update anchor
```
