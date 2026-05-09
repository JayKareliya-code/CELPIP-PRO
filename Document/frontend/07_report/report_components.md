# CELPIP PRO — Report Components

**Author:** Senior Web Developer  
**Location:** `apps/web/components/report/`  
**Route:** `app/(main)/attempts/[attemptId]/report/page.tsx`

---

## 1. `ReportPage.tsx` — Report Route Orchestrator

**Type:** `"use client"`  
**Data source:** `useAttemptReport(attemptId)` → `GET /api/v1/attempts/{id}/report`

### Purpose
Top-level report page. Resolves loading/error states, then branches on
`report.plan` to render `ProReport` or `StarterReport`.

### Logic
```
useAttemptReport(attemptId)
    ↓ isLoading  → ReportSkeleton
    ↓ isError    → ErrorState
    ↓ report.plan === "starter" → StarterReport
    ↓ report.plan === "pro" | "ultra" → ProReport
```

---

## 2. `ProReport.tsx` — 3-Tab Full Report (Pro / Ultra)

**Type:** `"use client"`  
**Tabs:** `coaching` | `response` | `analytics`

### Purpose
The primary report UI for paid plan users. A tabbed layout replacing the
previous 60/40 split-screen design. Tab content is **conditionally rendered**
(not hidden with CSS) so child network requests fire only when the user opens
that tab.

### Props
`report: ReportResponse`, `targetBand: number | null`

### Tab Architecture

#### Tab 1: Coaching Report (`default`)
```
ScoreSummaryCard          ← band gauge + next milestone pill
DimensionBreakdown        ← rubric bars (Content, Vocab, Grammar…)
FeedbackToggle            ← Strengths ↔ Weaknesses toggle panel
ImprovementTipsAccordion  ← Accordion of drill cards per tip
SampleResponseCard        ← Band-targeted model answer
ReportFooterCta           ← Personalised next-step CTA
```

#### Tab 2: My Response
```
ResponsePanel             ← Read-only: prompt + transcript/essay
```

#### Tab 3: Analytics
```
ScoreProgressCard         ← Band trend chart (fires API call on tab open)
TranscriptAnalysisCard    ← Speaking only: word-count, pace, filler words
EssayAnalysisCard         ← Writing only: paragraph structure, word variety
```

### `ReportFooterCta` (local sub-component)
Personalised CTA driven by the **weakest dimension**:
```typescript
const weakestDim = report.dimensions.reduce((min, d) => d.score < min.score ? d : min);
```
- Weakest dimension found → *"Your weakest area was [Label] at [X/12]. Targeting this…"*
- No dimensions → generic "Keep practising" message
- Action buttons: `My History` + `Practice Again →` (links to same prompt)

### Sticky Tab Bar
`sticky top-[3.5rem]` — sits directly below the main Navbar (56px height).
`backdrop-blur-md bg-background/80` — frosted glass as content scrolls under.

---

## 3. `ScoreSummaryCard.tsx` — Animated Band Score Gauge

**Type:** `"use client"` — uses `useEffect` + `useLayoutEffect` for rAF animation

### Purpose
Hero card at the top of the Coaching Report tab. Shows an animated SVG arc
gauge, the estimated band, skill badge, completion date, word count, and an
AI-generated next milestone coaching pill.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `estimatedBand` | `number` | Raw AI score (can be float, e.g. 8.4) |
| `skill` | `Skill` | `"speaking" \| "writing"` |
| `completedAt` | `string` | ISO timestamp |
| `nextMilestone?` | `string` | AI coaching note: "Do X to reach Band N+0.5" |
| `wordCount?` | `number` | Transcript word count (speaking only) |

### SVG Arc Gauge Animation
Two-phase animation using `rAF` (no CSS transition — avoids jitter):

```
Phase 1: useLayoutEffect → setAnimated(0)  [resets arc before paint]
Phase 2: useEffect → rAF loop ease-out cubic over 1200ms → setAnimated(displayBand)
```

Arc uses 75% of circumference (270° arc — standard gauge style).
`stroke-dashoffset = circumference × 0.75 × (1 - animated/12)`

### Band Colour Palette

| Band | Stroke | Text |
|------|--------|------|
| ≥ 9 | `#34D399` (emerald) | `text-emerald-400` |
| ≥ 6 | `#FBBF24` (amber) | `text-amber-400` |
| < 6 | `#F87171` (rose) | `text-rose-400` |

### Word Count Stats (Speaking)
At ~130 WPM, estimates speaking duration: `"42 words · ~19s est."`

### Next Milestone Pill
Amber coaching note from AI: rendered as `border-amber-500/20 bg-amber-500/6`
pill with a `Target` icon.

---

## 4. `DimensionBreakdown.tsx` — Rubric Score Bars

**Type:** Server Component

### Purpose
Renders one animated `ProgressBar` per scoring dimension (e.g., Content,
Vocabulary, Grammar, Coherence, Pronunciation for Speaking).

### Props
`dimensions: { label: string; score: number; max_score: number }[]`

### Bar Colour
Reuses `bandPalette()` logic — green for ≥ 9, amber for ≥ 6, rose for < 6.
Each bar is labelled with the dimension name and `score/max_score`.

---

## 5. `FeedbackPanels.tsx` — Strengths / Weaknesses Toggle

**Type:** `"use client"` — controlled toggle state

### `FeedbackToggle` Component
A two-tab toggle (`Strengths` | `Weaknesses`). Each tab renders a list of
AI-generated feedback bullets.

### Props
`strengths: string[]`, `weaknesses: string[]`

### Design
- Toggle bar: `rounded-lg border border-border bg-surface` with sliding
  amber underline indicator
- Strength items: `CheckCircle2` icon in `success` colour
- Weakness items: `AlertTriangle` icon in `warning` colour

---

## 6. `ImprovementTipsAccordion.tsx` — Coaching Drill Cards

**Type:** `"use client"` — accordion open/close state

### Purpose
An accordion of AI-generated coaching tips. Each item can be expanded to
reveal a detailed drill or exercise.

### Props
`tips: ImprovementTip[]`

```typescript
interface ImprovementTip {
  title:       string;
  description: string;
  drill?:      string;  // Optional practice exercise
  example?:    string;  // Optional model example
}
```

### Behaviour
- First tip is expanded by default
- Only one tip open at a time (exclusive accordion)
- Expand/collapse icon: `ChevronDown` with 180° rotate transition

---

## 7. `SampleResponseCard.tsx` — Band-Targeted Model Answer

**Type:** `"use client"` — copy-to-clipboard state

### Purpose
Displays an AI-generated sample response tailored to the user's target band.
Includes a copy button and a "This is a model answer" disclaimer.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `sampleResponse` | `string` | AI-generated model answer |
| `targetBand` | `number \| null` | User's target band (shown in card header) |
| `taskNumber` | `number` | For context label |

### Copy State
`isCopied` state — shows `"Copied!"` for 2s after click, then reverts to
`ClipboardCopy` icon.

---

## 8. `ResponsePanel.tsx` — Read-Only Prompt + Response View

**Type:** `"use client"`

### Purpose
The "My Response" tab content. Renders the original prompt side-by-side with
the user's transcript (speaking) or essay (writing).

### Props
`skill`, `taskNumber`, `promptText`, `instructionsText?`, `contextImageUrl?`,
`choiceOptions?`, `curveballOption?`, `curveballInstructionText?`, `userResponseText`

### Speaking View
- **Left:** Prompt text + optional context image (blurred by default, click to reveal)
- **Right:** Full transcript text

### Writing View
- **Top:** Full prompt text (read-only)
- **Bottom:** User essay text (read-only, serif font)

---

## 9. `ScoreProgressCard.tsx` — Band Trend Chart

**Type:** `"use client"`  
**Data source:** `useAttemptHistory(skill, taskNumber)` — fires when Analytics tab opens

### Purpose
Line chart showing band score trend across all attempts for the same task.
Highlights the current attempt.

### Props
`currentBand`, `skill`, `taskNumber`, `currentAttemptId`, `currentDimensions`

### Chart Library
Custom SVG-based sparkline (no external chart library). X-axis = attempt index,
Y-axis = band 1–12. Current attempt point is highlighted amber.

---

## 10. `TranscriptAnalysisCard.tsx` — Speaking Speech Analytics

**Type:** `"use client"` — computes stats client-side  
**Speaking only** — shown in Analytics tab when `hasTranscript = true`

### Purpose
Analyses the raw transcript text to surface objective speech statistics.
No additional API call — derives everything from `report.transcript`.

### Metrics Computed

| Metric | Computation |
|--------|------------|
| Word count | `transcript.split(/\s+/).length` |
| Speech pace | `(wordCount / taskDurationS) × 60` → WPM |
| Filler word count | Count occurrences of `["um", "uh", "like", "you know", …]` |
| Filler word rate | `(fillerCount / wordCount) × 100` → % |

### Props
`transcript: string`, `taskDurationS: number`

---

## 11. `EssayAnalysisCard.tsx` — Writing Essay Analytics

**Type:** `"use client"` — computes stats client-side  
**Writing only** — shown in Analytics tab when `hasEssay = true`

### Purpose
Surfaces objective writing statistics from the submitted essay text.

### Metrics Computed
Word count, sentence count, average sentence length, paragraph count, unique
word ratio (vocabulary diversity), and approximate reading time.

---

## 12. `StarterReport.tsx` — Locked Report (Starter Plan)

**Type:** `"use client"`

### Purpose
A preview-only report for Starter plan users. Shows the estimated band score
and dimension names but locks the detailed feedback behind a Pro upgrade CTA.

### Content
- `ScoreSummaryCard` — band gauge shown
- `LockedDimensionPreview` — blurred/locked dimension bars
- `ReportUpgradeCTA` — amber "Upgrade to Pro" panel
- `LockedSection` — locked feedback sections with lock icons

---

## 13. `ReportSkeleton.tsx` — Loading Placeholder

**Type:** Server Component

`animate-pulse` skeleton matching the ProReport layout. Shown while
`useAttemptReport` is loading.

---

## 14. `ReportTabNav.tsx` — Sticky Report Tabs

**Type:** `"use client"` — active tab indicator

### Purpose
Horizontal tab bar for the `ProReport` layout. Renders amber underline
indicator on the active tab.

### Props
`tabs: ReportTab[]`, `activeTab: string`, `onChange: (id: string) => void`

```typescript
interface ReportTab {
  id:    string;
  label: string;
}
```

---

## Report Data Flow

```
GET /api/v1/attempts/{attemptId}/report
    ↓ returns ReportResponse:
        attempt_id, skill, task_number, estimated_band
        dimensions[]       ← per-rubric scores
        strengths[]        ← AI bullet points
        weaknesses[]       ← AI bullet points
        improvement_tips[] ← drill cards
        sample_response    ← model answer text
        transcript         ← speaking only
        user_response_text ← essay (writing) or transcript mirror
        next_milestone     ← AI coaching note
        prompt_text, context_image_url, choice_options, curveball_option
        completed_at, plan
```
