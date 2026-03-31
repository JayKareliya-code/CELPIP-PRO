# Phase 1 — UI-First Implementation Plan
### Fully Modular · Next.js 14 · Tailwind CSS + shadcn/ui · Every Component in Its Own File

---

## Guiding Principles

1. **UI-first** — every page is browsable with mock data before any backend is wired
2. **One component, one file** — no "mega-components", never more than ~150 lines per file
3. **Tailwind CSS for all styling** — utility classes only; design tokens defined once in `tailwind.config.ts`; **no inline styles**, **no CSS modules** except for keyframe animations
4. **shadcn/ui for primitives** — Dialog, Accordion, Badge, Tabs, Progress, Spinner — copy-pasted into the project, zero runtime library overhead, fully accessible (Radix UI)
5. **Clerk auth** — login/register pages use Clerk's hosted components, auth state gates every protected route
6. **Separation of concerns** — components only render; data fetching lives in hooks; business logic lives in services

---

## Tech Stack (UI Layer)

| Concern | Tool | Why |
|---|---|---|
| Framework | Next.js 14 App Router + TypeScript | SSR, file-based routing, RSCs |
| Styling | **Tailwind CSS v3** | Utility-first, purged at build → tiny bundle |
| UI Primitives | **shadcn/ui** (Radix UI) | Accessible, copy-pasted — no runtime dep |
| Icons | `lucide-react` | Clean, consistent, tree-shakeable |
| Auth UI | `@clerk/nextjs` | Hosted sign-in/sign-up, JWT, social login |
| Global state | Zustand | Lightweight practice session state machine |
| Data fetching | TanStack React Query v5 | Caching, polling, background refetch |
| Rich Text Editor | Tiptap | Headless, composable, works with Tailwind |
| Charts | Recharts | Phase 3 stub — lightweight SVG charts |
| Fonts | `next/font` — Inter (body) + Source Serif 4 (editor) | Zero layout shift |

---

## All Pages — Route Map

```
/                           → Landing page (public)
/sign-in                    → Clerk sign-in UI
/sign-up                    → Clerk sign-up UI

/dashboard                  → User home (auth required)

/speaking                   → Speaking module home — task grid
/speaking/[task]            → Task instruction screen
/speaking/[task]/practice   → Live practice flow (countdown → prep → record)
/speaking/[task]/tips       → Vocabulary, connectors, templates for this task

/writing                    → Writing module home — task grid
/writing/[task]             → Task instruction screen
/writing/[task]/practice    → Live writing flow (countdown → editor + timer)

/attempts/[id]/status       → "Processing…" polling screen
/attempts/[id]/report       → Feedback report (Phase 2 — stub card in Phase 1)

/history                    → Attempt history (Phase 2 — stub in Phase 1)
/progress                   → Progress charts (Phase 3 — stub in Phase 1)
/billing                    → Plans + upgrade (Phase 3 — stub in Phase 1)

/admin                      → Admin home (admin role required)
/admin/prompts              → Prompt management table
/admin/calibration          → Calibration sample manager
```

---

## Component Tree — Every File Listed

```
apps/web/
├── app/                              ← Next.js App Router pages
│   ├── layout.tsx                    ← RootLayout: ClerkProvider + Tailwind fonts + ReactQuery
│   ├── page.tsx                      ← Landing page (redirects to /dashboard if signed in)
│   │
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   │
│   ├── dashboard/
│   │   └── page.tsx
│   │
│   ├── speaking/
│   │   ├── page.tsx                  ← Renders <SpeakingModuleHome />
│   │   └── [task]/
│   │       ├── page.tsx              ← Renders <TaskInstructionPage skill="speaking" />
│   │       ├── practice/
│   │       │   └── page.tsx          ← Renders <SpeakingPracticeSession />
│   │       └── tips/
│   │           └── page.tsx          ← Renders <TaskTipsPage />
│   │
│   ├── writing/
│   │   ├── page.tsx
│   │   └── [task]/
│   │       ├── page.tsx
│   │       └── practice/
│   │           └── page.tsx
│   │
│   ├── attempts/[id]/
│   │   ├── status/page.tsx
│   │   └── report/page.tsx
│   │
│   ├── history/page.tsx
│   ├── progress/page.tsx
│   ├── billing/page.tsx
│   │
│   └── admin/
│       ├── layout.tsx                ← Admin auth guard
│       ├── page.tsx
│       ├── prompts/page.tsx
│       └── calibration/page.tsx
│
│
├── components/                       ← ALL COMPONENTS HERE — one file each
│   │
│   ├── layout/
│   │   ├── Navbar.tsx                ← Main site navigation bar
│   │   ├── Sidebar.tsx               ← Collapsible sidebar (dashboard + inner pages)
│   │   ├── Footer.tsx                ← Site footer
│   │   ├── PageWrapper.tsx           ← Container + padding + auth guard wrapper
│   │   ├── BreadcrumbNav.tsx         ← Dynamic breadcrumb from route segments
│   │   └── PlaceholderPage.tsx       ← "Coming soon" stub for Phase 2/3 pages
│   │
│   ├── landing/
│   │   ├── HeroSection.tsx           ← Headline, CTA buttons, hero illustration
│   │   ├── FeaturesGrid.tsx          ← 3-column features overview
│   │   ├── HowItWorksSection.tsx     ← 3-step explainer
│   │   ├── PricingPreview.tsx        ← Teaser pricing cards (links to /billing)
│   │   └── TestimonialsSection.tsx   ← 3 testimonial cards (placeholder)
│   │
│   ├── dashboard/
│   │   ├── WelcomeBanner.tsx         ← "Good morning, Jay 👋" + streak badge
│   │   ├── QuickStartCard.tsx        ← "Start Speaking Practice" + "Start Writing" CTAs
│   │   ├── RecentAttemptsWidget.tsx  ← Last 3 attempts, mini score badge, link to history
│   │   ├── ProgressSummaryWidget.tsx ← Current band estimate (placeholder chart in P1)
│   │   ├── WeakAreasWidget.tsx       ← Top 2–3 weak dimensions (stub in P1)
│   │   ├── StreakWidget.tsx          ← Streak days + last active date
│   │   └── TargetBandWidget.tsx      ← Shows target band; click to edit
│   │
│   ├── speaking/
│   │   ├── SpeakingModuleHome.tsx    ← Page shell: header + TaskGrid
│   │   ├── TaskGrid.tsx              ← Responsive grid of TaskCard components
│   │   ├── TaskCard.tsx              ← Single task card (number, name, time badges)
│   │   ├── TaskInstructionPage.tsx   ← Full instruction layout for a task
│   │   ├── TaskPromptBox.tsx         ← Renders the prompt text + image if any
│   │   ├── TaskMetaBadges.tsx        ← Prep time + Response time pill badges
│   │   ├── StartPracticeButton.tsx   ← CTA that routes to /speaking/[task]/practice
│   │   ├── CountdownOverlay.tsx      ← Fullscreen 3→2→1→GO overlay (shared)
│   │   ├── PrepTimerScreen.tsx       ← Circular countdown ring during prep phase
│   │   ├── RecordingInterface.tsx    ← Waveform animation + response timer bar
│   │   ├── UploadProgressBar.tsx     ← S3 upload progress indicator
│   │   ├── ProcessingScreen.tsx      ← "Analyzing your response…" + spinner
│   │   ├── Task5PartIndicator.tsx    ← Special: Part 1 / Part 2 switcher for Task 5
│   │   ├── VocabularyPanel.tsx       ← Key vocab chips for the task
│   │   ├── ConnectorList.tsx         ← Discourse markers / connectors list
│   │   └── TemplateCard.tsx          ← Structural template suggestion card
│   │
│   ├── writing/
│   │   ├── WritingModuleHome.tsx     ← Page shell: header + WritingTaskGrid
│   │   ├── WritingTaskGrid.tsx       ← Grid: 2 task cards (Task 1 + Task 2)
│   │   ├── WritingTaskCard.tsx       ← Task card with task type + word limit badges
│   │   ├── WritingInstructionPage.tsx ← Instruction layout for writing task
│   │   ├── WritingPromptBox.tsx      ← Renders prompt text
│   │   ├── WritingMetaBadges.tsx     ← Time limit + min/max word count badges
│   │   ├── WritingEditor.tsx         ← Tiptap editor with toolbar
│   │   ├── WritingToolbar.tsx        ← Bold/Italic/Bullets within editor
│   │   ├── WordCounter.tsx           ← Live word + char count display
│   │   ├── WritingTimerBar.tsx       ← Top progress bar (green→yellow→red)
│   │   ├── TimerDisplay.tsx          ← MM:SS clock (shared by speaking + writing)
│   │   ├── SubmitWritingButton.tsx   ← Manual submit CTA
│   │   ├── IdeaHintsPanel.tsx        ← Collapsible idea hints accordion
│   │   ├── IntroTemplateCard.tsx     ← Intro paragraph template (collapsible)
│   │   └── ConclusionTemplateCard.tsx ← Conclusion template (collapsible)
│   │
│   ├── attempts/
│   │   ├── AttemptStatusCard.tsx     ← Status badge + spinner or result link
│   │   ├── ReportPlaceholder.tsx     ← "Report will appear here" stub (Phase 1)
│   │   └── AttemptHistoryTable.tsx   ← Paginated table of past attempts
│   │
│   ├── admin/
│   │   ├── AdminSidebar.tsx          ← Admin-specific nav sidebar
│   │   ├── SpeakingPromptTable.tsx   ← Data table: all speaking prompts
│   │   ├── WritingPromptTable.tsx    ← Data table: all writing prompts
│   │   ├── PromptFormModal.tsx       ← Create/Edit prompt modal (shadcn/ui Dialog)
│   │   ├── CalibrationSampleTable.tsx ← List of calibration samples
│   │   └── CalibrationSampleForm.tsx  ← Add/edit calibration sample form
│   │
│   └── common/
│       ├── LoadingSpinner.tsx         ← Centered Tailwind spinner (animate-spin)
│       ├── ErrorAlert.tsx             ← shadcn/ui Alert for API errors
│       ├── EmptyState.tsx             ← Empty illustration + message
│       ├── ConfirmModal.tsx           ← Generic confirm/cancel modal
│       ├── ScoreBadge.tsx             ← Band score badge (color-coded 1–12)
│       ├── SkillBadge.tsx             ← "Speaking" / "Writing" pill
│       ├── StatusBadge.tsx            ← pending/processing/complete/failed badge
│       ├── TimerRing.tsx              ← SVG circular countdown ring (prep phase)
│       ├── WaveformAnimation.tsx      ← Animated bars during recording
│       └── PaywallModal.tsx           ← Upgrade modal shown on quota exceeded
│
├── lib/
│   ├── api.ts                         ← Typed fetch wrapper (base URL from env)
│   ├── mockData.ts                    ← ALL mock data for browsability without API
│   ├── types.ts                       ← Shared TypeScript types/interfaces
│   ├── constants.ts                   ← Task timings, plan limits, routes
│   ├── utils.ts                       ← formatTime(), wordCount(), cn() etc.
│   └── hooks/
│       ├── useCurrentUser.ts          ← Clerk user + DB user merged hook
│       ├── useSpeakingAttempt.ts      ← Full speaking session state machine
│       ├── useWritingAttempt.ts       ← Full writing session state machine
│       ├── useAttemptStatus.ts        ← Polling hook (React Query refetch)
│       ├── usePrompts.ts              ← Fetch speaking/writing prompts
│       └── useQuota.ts               ← Check remaining attempts for free users
│
├── store/
│   └── practiceSessionStore.ts        ← Zustand store: active session state
│
├── styles/
│   └── globals.css                    ← Tailwind directives + CSS custom properties (design tokens)
│
└── public/
    └── images/
        ├── hero-illustration.svg
        └── empty-state.svg
```

---

## Design System — Tailwind Config + CSS Tokens

All colours, spacing, and typography are defined **once** in `tailwind.config.ts` and `globals.css`. Every component uses these tokens via utility classes — no hardcoded hex values in TSX files.

### `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────────────
        primary:   { DEFAULT: "#4F46E5", hover: "#4338CA", light: "#EEF2FF" },
        success:   { DEFAULT: "#10B981", light: "#ECFDF5" },
        warning:   { DEFAULT: "#F59E0B", light: "#FFFBEB" },
        danger:    { DEFAULT: "#EF4444", light: "#FEF2F2" },
        // ── Neutrals ───────────────────────────────────────────────
        surface:   "#FFFFFF",        // card backgrounds
        muted:     "#F9FAFB",        // page background
        border:    "#E5E7EB",        // card/input borders
        subtle:    "#6B7280",        // secondary text
        // ── Practice dark mode ─────────────────────────────────────
        canvas:    "#111827",        // full-screen practice background
        "canvas-text": "#F9FAFB",
      },
      fontFamily: {
        sans:  ["Inter", "system-ui", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "serif"], // writing editor
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg:      "0.75rem",
        xl:      "1rem",
        full:    "9999px",
      },
      boxShadow: {
        card:   "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)",
        panel:  "0 10px 25px rgba(0,0,0,0.08)",
        focus:  "0 0 0 3px rgba(79,70,229,0.3)",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%":       { transform: "scale(1.05)", opacity: "0.8" },
        },
        "timer-tick": {
          "0%":   { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "283" }, // 2πr for r=45
        },
      },
      animation: {
        "pulse-ring":  "pulse-ring 1.5s ease-in-out infinite",
        "timer-tick":  "timer-tick linear",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],  // prose class for writing editor
};

export default config;
```

### `styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-muted text-gray-900 font-sans antialiased;
  }
  h1, h2, h3, h4 {
    @apply font-bold tracking-tight;
  }
}

/* Band score colour helpers — used by ScoreBadge component */
@layer utilities {
  .band-high { @apply text-success font-bold; }   /* Band 9–12 */
  .band-mid  { @apply text-warning font-bold; }   /* Band 6–8  */
  .band-low  { @apply text-danger  font-bold; }   /* Band 1–5  */
}
```

### shadcn/ui Components Used (Copy-Pasted — No Runtime Library)

| shadcn/ui Component | Used In |
|---|---|
| `Dialog` | PromptFormModal, ConfirmModal, PaywallModal |
| `Accordion` | VocabularyPanel, IdeaHintsPanel, IntroTemplateCard |
| `Badge` | TaskMetaBadges, ScoreBadge, StatusBadge, SkillBadge |
| `Progress` | WritingTimerBar, UploadProgressBar, RecordingInterface |
| `Tabs` | Admin prompt management page |
| `Table` | SpeakingPromptTable, WritingPromptTable, AttemptHistoryTable |
| `Alert` | ErrorAlert |
| `Skeleton` | Loading states on dashboard widgets |
| `Tooltip` | TaskMetaBadges hover detail |

---

## Page-by-Page Component Breakdown

### 📄 Landing Page `/`

```
LandingPage
  ├── Navbar (transparent bg on landing, opaque on scroll)
  ├── HeroSection
  │     ├── max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12
  │     ├── Headline + sub-headline + CTA buttons (Link to /sign-up, /sign-in)
  │     └── hero-illustration.svg (right column)
  ├── FeaturesGrid
  │     └── grid grid-cols-1 md:grid-cols-3 gap-6: Speaking, Writing, Progress cards
  ├── HowItWorksSection
  │     └── Numbered steps (flex + border-l connector line)
  ├── PricingPreview
  │     └── grid grid-cols-1 md:grid-cols-3 gap-6: Free, Premium, Premium+ cards
  ├── TestimonialsSection
  │     └── grid grid-cols-1 md:grid-cols-3 gap-6: 3 quote cards
  └── Footer
```

---

### 📄 Sign In / Sign Up `/sign-in`, `/sign-up`

```
AuthPage
  ├── Navbar (minimal, logo only)
  ├── min-h-screen flex items-center justify-center bg-muted
  │     ├── <SignIn /> (Clerk component — themed to match Tailwind palette via Clerk appearance prop)
  │     └── OR <SignUp /> (Clerk component)
  └── "Back to home" link below the form
```

---

### 📄 Dashboard `/dashboard`

```
DashboardPage
  ├── Navbar
  ├── Sidebar (hidden on mobile via lg:block, hamburger on mobile)
  ├── PageWrapper  (flex-1 p-6 max-w-7xl mx-auto)
  │     ├── WelcomeBanner           ← "Good morning, [name] 👋" + streak badge
  │     ├── grid grid-cols-1 lg:grid-cols-3 gap-6
  │     │     ├── lg:col-span-2
  │     │     │     ├── QuickStartCard  ← Two large buttons (speaking + writing)
  │     │     │     └── RecentAttemptsWidget  ← shadcn/ui Table, last 3 rows
  │     │     └── lg:col-span-1  (right column)
  │     │           ├── TargetBandWidget
  │     │           ├── StreakWidget
  │     │           └── WeakAreasWidget  ← shadcn/ui Skeleton stub in Phase 1
  └── Footer
```

---

### 📄 Speaking Module Home `/speaking`

```
SpeakingPage
  ├── Navbar + Sidebar
  ├── PageWrapper
  │     ├── BreadcrumbNav + page heading row
  │     └── TaskGrid
  │           └── grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
  │                [PracticeCard] + [Task1Card] ... [Task8Card]   (9 total)
  │                Each TaskCard (rounded-xl border border-border bg-surface shadow-card p-5):
  │                  ├── <Badge> (task number, primary colour)
  │                  ├── Task name (text-lg font-semibold)
  │                  ├── TaskMetaBadges (prep + response time — outline badges)
  │                  ├── Short description (text-sm text-subtle)
  │                  └── "Start Practice" <Button> (w-full, primary) → /speaking/[task]
  └── Footer
```

---

### 📄 Speaking Instruction Screen `/speaking/[task]`

```
SpeakingTaskPage
  ├── Navbar + Sidebar
  ├── PageWrapper
  │     ├── BreadcrumbNav  ← Speaking > Task 1 — Giving Advice
  │     ├── grid grid-cols-1 lg:grid-cols-3 gap-8
  │     │     ├── lg:col-span-2
  │     │     │     ├── TaskPromptBox  (bg-surface rounded-xl border p-6, text-base leading-relaxed)
  │     │     │     └── TaskMetaBadges (flex gap-2: "Prep: 30s" | "Response: 90s" outline badges)
  │     │     └── lg:col-span-1 space-y-4
  │     │           ├── VocabularyPanel   (shadcn/ui Accordion)
  │     │           ├── ConnectorList     (shadcn/ui Accordion item)
  │     │           └── TemplateCard      (shadcn/ui Accordion item)
  │     └── StartPracticeButton  (w-full mt-6, size="lg", variant="default")
  └── Footer
```

---

### 📄 Speaking Practice Session `/speaking/[task]/practice`

*Full-screen dark mode. No navbar/sidebar. Escape key = confirm exit.*

```
SpeakingPracticeSession
  ├── [State: COUNTDOWN]
  │     └── CountdownOverlay     ← 3 → 2 → 1 → GO fullscreen
  │
  ├── [State: PREP]
  │     ├── TaskPromptBox (read the prompt)
  │     ├── PrepTimerScreen
  │     │     ├── TimerRing (SVG circular countdown)
  │     │     └── TimerDisplay (MM:SS)
  │     └── Task5PartIndicator   ← only shown for Task 5 (Part 1 of 2)
  │
  ├── [State: RECORDING]
  │     ├── RecordingInterface
  │     │     ├── WaveformAnimation
  │     │     ├── TimerDisplay
  │     │     └── shadcn/ui <Progress> (response time bar, red when < 10s)
  │     └── Task5PartIndicator   ← Part 2 indicator after Part 1 ends
  │
  ├── [State: UPLOADING]
  │     └── UploadProgressBar
  │
  └── [State: PROCESSING]
        └── ProcessingScreen
              ├── LoadingSpinner
              └── "Analyzing your response..." message
```

---

### 📄 Writing Module Home `/writing`

```
WritingPage
  ├── Navbar + Sidebar
  ├── PageWrapper
  │     ├── BreadcrumbNav + heading
  │     └── WritingTaskGrid
  │           └── grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl
  │                [Task1Card] + [Task2Card]
  │                Each WritingTaskCard (larger card, more content-focused):
  │                  ├── "Task 1" <Badge> (outline)
  │                  ├── "Writing an Email" (text-xl font-semibold)
  │                  ├── Task type badge (e.g. "Email Format", secondary)
  │                  ├── WritingMetaBadges (27 min | 150–200 words)
  │                  ├── Short description of the task format
  │                  └── "Start Practice" button (w-full primary) → /writing/[task]
  └── Footer
```

---

### 📄 Writing Instruction Screen `/writing/[task]`

```
WritingTaskPage
  ├── Navbar + Sidebar
  ├── PageWrapper
  │     ├── BreadcrumbNav
  │     ├── grid grid-cols-1 lg:grid-cols-3 gap-8
  │     │     ├── lg:col-span-2
  │     │     │     ├── WritingPromptBox   (bg-surface border rounded-xl p-6, prose)
  │     │     │     └── WritingMetaBadges  (flex gap-2)
  │     │     └── lg:col-span-1 space-y-3
  │     │           ├── IdeaHintsPanel     ← shadcn/ui Accordion
  │     │           ├── IntroTemplateCard  ← shadcn/ui Accordion item
  │     │           └── ConclusionTemplateCard ← shadcn/ui Accordion item
  │     └── "Start Writing" <Button> (size="lg" w-full mt-6)
  └── Footer
```

---

### 📄 Writing Practice Session `/writing/[task]/practice`

*Full-screen, focus-mode. No distractions.*

```
WritingPracticeSession
  ├── [State: COUNTDOWN]
  │     └── CountdownOverlay
  │
  └── [State: WRITING]
        ├── WritingTimerBar      ← thin bar across top of screen
        ├── Header row
        │     ├── TimerDisplay  ← MM:SS
        │     ├── WordCounter   ← "247 words (min 150)"
        │     └── SubmitWritingButton
        ├── WritingPromptBox     ← read-only prompt strip above editor
        └── WritingEditor        ← Tiptap + WritingToolbar
              └── [State: SUBMITTING] → ProcessingScreen
```

---

### 📄 Processing Screen `/attempts/[id]/status`

```
AttemptStatusPage
  ├── Navbar (minimal)
  ├── PageWrapper centered
  │     └── AttemptStatusCard
  │           ├── LoadingSpinner (lg)
  │           ├── "Analyzing Your Response" heading
  │           ├── Friendly message + estimated wait time
  │           ├── StatusBadge (processing/complete/failed)
  │           └── [When complete] Link to /attempts/[id]/report
  └── (polls every 3s via useAttemptStatus hook)
```

---

### 📄 Admin — Prompt Management `/admin/prompts`

```
AdminPromptsPage
  ├── Navbar + AdminSidebar
  ├── PageWrapper
  │     ├── shadcn/ui <Tabs> (Speaking | Writing)
  │     ├── [Tab: Speaking]
  │     │     ├── "Add Prompt" <Button> variant="outline" → opens PromptFormModal
  │     │     └── SpeakingPromptTable (shadcn/ui <Table>)
  │     │           └── Columns: Task #, Title, Prep, Response, Active toggle, Edit/Delete
  │     └── [Tab: Writing]
  │           ├── "Add Prompt" <Button>
  │           └── WritingPromptTable
  └── PromptFormModal (shadcn/ui Dialog, rendered once, open state controlled by parent)
```

---

## Mock Data Strategy (Browsability Without Backend)

**File: `lib/mockData.ts`**

```typescript
// All pages use this data when NEXT_PUBLIC_USE_MOCK=true (dev)
// or when the API is unavailable

export const MOCK_SPEAKING_TASKS = [
  {
    id: "practice",
    task_number: 0,
    title: "Practice Task",
    prep_time_seconds: 30,
    response_time_seconds: 60,
    prompt_text: "Describe what you usually do on a typical morning.",
    difficulty: "easy",
    vocabulary_tips: ["typically", "usually", "first of all", "after that"],
    template_hint: "Start by saying: 'On a typical morning, I usually...'",
  },
  {
    id: "task-1",
    task_number: 1,
    title: "Giving Advice",
    prep_time_seconds: 30,
    response_time_seconds: 90,
    prompt_text: "Your friend wants to improve their English but doesn't know how to start...",
    difficulty: "medium",
    vocabulary_tips: ["I would suggest", "you might want to", "one effective approach is"],
    template_hint: "1. Acknowledge the situation → 2. Give 2 clear pieces of advice → 3. Encourage",
  },
  // ... Tasks 2–8 + Task 5 with parts flag
];

export const MOCK_USER = {
  id: "mock-user-1",
  full_name: "Jay Kareliya",
  plan: "free",
  streak_days: 5,
  target_band: 9,
};

export const MOCK_RECENT_ATTEMPTS = [
  { id: "att-1", skill: "speaking", task_title: "Giving Advice", status: "complete",
    estimated_band: 7.5, created_at: "2026-03-27T14:30:00Z" },
  { id: "att-2", skill: "writing", task_title: "Writing an Email", status: "processing",
    estimated_band: null, created_at: "2026-03-28T09:00:00Z" },
];
```

---

## Build Order (Week 3 — Day by Day)

| Day | What Gets Built |
|---|---|
| **Day 1** | Tailwind config, `globals.css` tokens, shadcn/ui init (`npx shadcn-ui init`), install all components, `Navbar`, `Footer`, `Sidebar`, `PageWrapper`, `RootLayout` |
| **Day 2** | Landing page: `HeroSection`, `FeaturesGrid`, `HowItWorksSection`, `PricingPreview`, `TestimonialsSection` |
| **Day 3** | Clerk auth pages (sign-in, sign-up + Clerk appearance theme); `Dashboard` all 6 widgets with mock data; common: `LoadingSpinner`, `ErrorAlert`, `EmptyState`, `ScoreBadge`, `StatusBadge`, `SkillBadge` |
| **Day 4** | Speaking module: `TaskGrid`, `TaskCard`, `TaskMetaBadges`, `TaskInstructionPage`, `TaskPromptBox`, `VocabularyPanel`, `ConnectorList`, `TemplateCard`, `StartPracticeButton` |
| **Day 5** | Speaking practice session: `CountdownOverlay`, `TimerRing`, `PrepTimerScreen`, `TimerDisplay`, `RecordingInterface`, `WaveformAnimation`, `Task5PartIndicator`, `UploadProgressBar`, `ProcessingScreen` |
| **Day 6** | Writing module: `WritingTaskGrid`, `WritingTaskCard`, `WritingMetaBadges`, `WritingInstructionPage`, `WritingPromptBox`, `IdeaHintsPanel`, `IntroTemplateCard`, `ConclusionTemplateCard` |
| **Day 7** | Writing practice: `WritingTimerBar`, `WritingEditor`, `WritingToolbar`, `WordCounter`, `SubmitWritingButton`; common: `PaywallModal`, `ConfirmModal` |
| **Day 8** | Attempt pages: `AttemptStatusCard`, `ReportPlaceholder`, `AttemptHistoryTable`; history + report stub pages |
| **Day 9** | Admin pages: `AdminSidebar`, `SpeakingPromptTable`, `WritingPromptTable`, `PromptFormModal`, `CalibrationSampleTable`, `CalibrationSampleForm` |
| **Day 10** | Wire all pages to real API (remove `NEXT_PUBLIC_USE_MOCK` flag); resolve integration issues; full browsability pass on all routes |

---

## Component Contract Examples

### `TaskCard.tsx` — Strict Props Interface

```typescript
// components/speaking/TaskCard.tsx

interface TaskCardProps {
  taskNumber: number | "practice";
  title: string;
  prepTimeSecs: number;
  responseTimeSecs: number;
  difficulty: "easy" | "medium" | "hard";
  isLocked?: boolean;           // true for Phase 4 (practice task unlocked always)
  onStartClick: () => void;
}
```

### `TimerDisplay.tsx` — Reused by Both Modules

```typescript
// components/common/TimerDisplay.tsx

interface TimerDisplayProps {
  secondsLeft: number;
  variant?: "light" | "dark";   // light for writing (white bg), dark for speaking
  size?: "sm" | "md" | "lg";
  pulseWhenCritical?: boolean;  // red pulsing class at <= 60s
}
```

### `ProcessingScreen.tsx` — Shared by Speaking + Writing

```typescript
// components/common/ProcessingScreen.tsx  (or attempts/)

interface ProcessingScreenProps {
  skill: "speaking" | "writing";
  attemptId: string;
  onComplete?: (reportUrl: string) => void;
}
// Internally uses useAttemptStatus hook — no polling logic in the component
```

---

## Acceptance Criteria for UI Phase

```
Layout
  [ ] Navbar shows correctly on all pages (auth state — signed in vs signed out)
  [ ] Sidebar collapses on mobile (hamburger toggle)
  [ ] All protected routes redirect to /sign-in when not authenticated
  [ ] Admin routes redirect non-admin users to /dashboard

Landing Page
  [ ] CTA buttons navigate to /sign-up and /sign-in
  [ ] Page renders without any console errors using mock data

Auth
  [ ] /sign-in loads Clerk sign-in form
  [ ] /sign-up loads Clerk sign-up form
  [ ] After sign-in, user is redirected to /dashboard

Speaking Flow
  [ ] All 9 task cards (Practice + Tasks 1–8) render in the grid
  [ ] Task 5 card displays "2 parts" note
  [ ] Clicking a task card → instruction screen with correct timings
  [ ] "Start Practice" → countdown overlay plays 3→2→1→GO
  [ ] Prep timer counts down with circular ring animation
  [ ] Recording phase starts automatically with waveform animation
  [ ] Response timer bar depletes to zero and auto-transitions
  [ ] Task 5 Part 1 ends → Part 2 begins automatically (no prep timer for Part 2)

Writing Flow
  [ ] Both task cards render (Task 1 + Task 2) with correct time limits
  [ ] Editor loads with Tiptap, word counter updates live
  [ ] Timer bar depletes (green→yellow at 5min→red at 1min)
  [ ] Auto-submit fires at zero
  [ ] Manual submit button works before timer ends

Tailwind Compliance
  [ ] No inline styles anywhere — all styling via Tailwind utility classes
  [ ] No hardcoded hex colours in TSX files — only Tailwind colour tokens
  [ ] All interactive elements have hover: and focus-visible: states
  [ ] Layout is fully responsive (mobile 375px → desktop 1440px)
  [ ] Practice screens use bg-canvas text-canvas-text (dark mode classes)
  [ ] shadcn/ui Dialog, Accordion, Badge, Progress, Tabs, Table all render correctly
```

---

> [!IMPORTANT]
> **Task 5 Special Case:** Task 5 "Comparing and Persuading" has a 60-second **shared prep time** for both parts, then Part 1 response (no separate timer — flows into Part 2), then Part 2 response. The `useSpeakingAttempt` state machine must handle this as a sub-state: `PREP → RECORDING_PART1 → RECORDING_PART2 → UPLOAD`. The `Task5PartIndicator` component makes this clear to the user.

> [!NOTE]
> **Styling stack: Tailwind CSS v3 + shadcn/ui.** Do not mix in Bootstrap or any other CSS framework. Every primitive (Modal, Badge, Accordion, Progress, Table, Tabs) uses the corresponding shadcn/ui component. The Tailwind `cn()` utility (from `clsx` + `tailwind-merge`) is the only way to conditionally apply classes — no `style={{}}` props.
