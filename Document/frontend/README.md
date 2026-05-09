# CELPIP PRO — Frontend Documentation Index

> **LLM Navigation Guide.** Read this file first to orient yourself in the
> frontend codebase. Each section links to the dedicated doc file for that
> module. All files are optimised for LLM browsing: Purpose → Sub-components
> → Props → Logic/Data Flow.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS v3 · Clerk Auth ·
React Query v5 · Zustand v4 · Sonner · Lucide Icons

**Monorepo path:** `apps/web/`

---

## Quick-Reference: File → Feature Map

| You want to understand… | Read… |
|-------------------------|-------|
| Global layout, Navbar, auth guard, SSE plan sync | `01_layout/layout_components.md` |
| Landing page hero, pricing, features grid | `02_landing/landing_components.md` |
| Dashboard widgets, streak, quota stats | `03_dashboard/dashboard_components.md` |
| Speaking practice session, task cards, phase router | `04_speaking/speaking_components.md` |
| Writing editor, draft persistence, word counter | `05_writing/writing_components.md` |
| Full 8-task mock exam shell, inter-task breaks | `06_exam/exam_components.md` |
| AI score report, band gauge, coaching tabs | `07_report/report_components.md` |
| Billing plans, Stripe checkout, SSE fallback polling | `08_billing/billing_components.md` |
| Progress tracking, task score cards, weak areas | `09_progress/progress_components.md` |
| History table, mock exam session accordion | `10_history_attempts/history_components.md` |
| Settings tabs, band goal, account deletion | `11_settings/settings_components.md` |
| Admin prompt management, calibration, filters | `12_admin/admin_components.md` |
| Common UI: TimerRing, ProcessingScreen, PaywallModal | `13_common_ui/common_components.md` |
| Zustand stores, React Query keys, state isolation | `14_state_management/state_management.md` |
| App Router structure, page files, middleware | `15_pages_routing/pages_routing.md` |

---

## Module Summaries

### `01_layout` — Layout Shell
Core wrappers used by every authenticated page.

| Component | Purpose |
|-----------|---------|
| `Navbar` | Top navigation, plan badge, profile dropdown |
| `Sidebar` | Mobile slide-in menu |
| `Providers` | Client context tree (QueryClient + AuthCacheGuard + SSE) |
| `AuthCacheGuard` | Wipes React Query cache on `userId` change (security) |
| `Footer` | Shared footer |
| `BreadcrumbNav` | Breadcrumb for deep routes |
| `PageWrapper` | Consistent `max-w` + padding container |

---

### `02_landing` — Landing Page
Public-facing marketing page at `/`.

| Component | Purpose |
|-----------|---------|
| `HeroSection` | Primary CTA above-the-fold |
| `FeaturesGrid` | 6-cell feature overview |
| `PricingPreview` | 3-tier plan comparison with dynamic limits |
| `TestimonialsSection` | Social proof |
| `CtaSection` | Bottom conversion section |

---

### `03_dashboard` — Dashboard
Authenticated home at `/dashboard`.

| Component | Purpose |
|-----------|---------|
| `WelcomeBanner` | Greeting + streak display |
| `DashboardStatusRow` | Band progress + inline target band editor |
| `QuickStartCard` | Navigation shortcuts to Speaking/Writing |
| `RecentAttemptsCompact` | Last 5 attempts feed |

---

### `04_speaking` — Speaking Practice Module
Route group: `(main)/speaking/`

| Component | Purpose |
|-----------|---------|
| `SpeakingModuleHome` | Task selection grid, quota stats, Starter banner |
| `SpeakingTaskCard` | 3-layer card: gradient + progress fill + content |
| `SpeakingPracticeSession` | Phase router → prep/recording/upload screens |
| `PrepTimerScreen` | Countdown timer + prompt display |
| `RecordingInterface` | Live mic recording with waveform visualiser |
| `Task5SelectionScreen` | Task 5 two-choice selection during prep |
| `Task5CurveballScreen` | Task 5 curveball reveal + Part 2 recording |
| `CountdownOverlay` | 3-2-1 session start screen |
| `UploadProgressBar` | Audio upload progress |

**Key hook:** `useSpeakingAttempt()` — full session state machine

---

### `05_writing` — Writing Practice Module
Route group: `(main)/writing/`

| Component | Purpose |
|-----------|---------|
| `WritingModuleHome` | Task selection (Task 1 + 2), quota stats |
| `WritingTaskCard` | Mirror of SpeakingTaskCard (emerald theme) |
| `WritingPracticeSession` | Phase router → countdown/writing/processing |
| `WritingEditor` | contenteditable + spell check + draft persistence |
| `WritingSessionHeader` | Sticky colour-coded countdown timer bar |
| `WritingPromptBox` | Read-only prompt display |
| `WordCounter` | Colour-coded word count with min/max |
| `SubmitWritingButton` | Submit CTA with loading state |

**Key hook:** `useWritingAttempt()` — full writing session state machine  
**Key feature:** Auto-submit on timer expiry (`secondsLeft === 0`)

---

### `06_exam` — Full Mock Exam
Route: `(main)/practice/speaking/[testNumber]`

| Component | Purpose |
|-----------|---------|
| `MockExamShell` | Root phase router for 8-task exam |
| `ExamIntroScreen` | Pre-exam task overview + "Begin Exam" CTA |
| `MockExamInfoBar` | Sticky exam progress bar (all phases) |
| `ExamProgressRail` | 8 task pills with pending/active/done/error states |
| `InterTaskBreakScreen` | 30s break with coaching tip + next task preview |
| `ExamCompleteScreen` | Summary + per-task report links |
| `ExamLoadingScreen` | Spinner while prompts load |

**Reuses:** All speaking phase screens (PrepTimerScreen, RecordingInterface, Task5*)  
**Key design:** `withNoInfoBar()` helper prevents double info bars  
**Session dedup:** `examSessionId` persisted in localStorage per slot

---

### `07_report` — AI Score Report
Route: `attempts/[id]/report`

| Component | Purpose |
|-----------|---------|
| `ReportPage` | Plan-branching router → ProReport or StarterReport |
| `ProReport` | 3-tab layout: Coaching / My Response / Analytics |
| `ScoreSummaryCard` | rAF-animated SVG arc gauge (band 1–12) |
| `DimensionBreakdown` | Per-rubric score bars |
| `FeedbackPanels` | Strengths ↔ Weaknesses toggle |
| `ImprovementTipsAccordion` | Coaching drill cards |
| `SampleResponseCard` | Band-targeted model answer |
| `ResponsePanel` | Read-only prompt + transcript/essay view |
| `ScoreProgressCard` | Band trend chart (deferred fetch on tab open) |
| `TranscriptAnalysisCard` | Speaking: WPM, filler words, word count |
| `EssayAnalysisCard` | Writing: paragraph count, word diversity |
| `StarterReport` | Locked preview + upgrade CTA |

---

### `08_billing` — Billing & Plans
Route: `(main)/billing`

| Component | Purpose |
|-----------|---------|
| `BillingPageClient` | Page orchestrator — 3-col grid, plan + cart wiring |
| `PlanCard` | CTA state machine (coming soon / active / upgrade) |
| `PlanGrid` | Plan card config + layout |
| `AddonCard` | Full add-on card (grid layout) with BillingSelect |
| `AddonRow` | Compact add-on card (3rd column layout) |
| `BillingSelect` | **Custom dropdown** — replaces native `<select>`, dark-safe cross-browser |
| `BillingCartDrawer` | Slide-in cart drawer (`bg-[#0D0F17]`, `font-light tracking-wide`) |
| `CartFAB` | Floating "View Cart" button — visible only when cart has items |
| `BillingCartPanel` | Cart items, totals, promo code, checkout CTA |
| `CurrentPlanBanner` | Active plan summary + portal link |
| `SuccessHandler` | Null-render: cache invalidation + SSE fallback polling |
| `BillingFAQ` | FAQ accordion |

**Key flow:** Stripe checkout → SSE plan_updated → React Query invalidation  
**Fallback:** 5s polling × 3 when SSE blocked by corporate proxy  
**Add-ons:** Purchasable by all users — Starter gets extra questions, Pro gets full AI reports

---

### `09_progress` — Progress Tracking
Route: `(main)/progress`

| Component | Purpose |
|-----------|---------|
| `ProgressPageClient` | Plan gate + skill tab manager |
| `ProgressOverviewStats` | 4-stat summary strip |
| `TaskScoreGrid` | Per-task score cards with sparkline |
| `ScoreSparkline` | SVG band trend mini-chart |
| `WeakAreaPanel` | Ultra-only rubric dimension bars |
| `RecentAttemptsFeed` | Paginated recent attempts list |

---

### `10_history_attempts` — History
Route: `(main)/history`

| Component | Purpose |
|-----------|---------|
| `HistoryPage` | Practice / Mock Exams view toggle |
| `HistoryFilterBar` | All / Speaking / Writing skill filter |
| `HistoryTable` | Responsive: desktop table + mobile card list |
| `MockExamHistorySection` | Expandable session accordion with per-task results |

---

### `11_settings` — Settings
Route: `(main)/settings`

| Component | Purpose |
|-----------|---------|
| `SettingsNav` | Adaptive sidebar/pill nav (5 tabs) |
| `ProfileTab` | Clerk identity + streak + target band |
| `GoalTab` | Band goal selector (4–12) + PATCH |
| `SubscriptionTab` | Plan summary + billing link |
| `PrivacyTab` | Data controls + analytics opt-out |
| `DangerTab` | 2-phase "DELETE" keyword account deletion |

---

### `12_admin` — Admin Panel
Route: `admin/`

| Component | Purpose |
|-----------|---------|
| `AdminSidebar` | 8-item nav with active detection |
| `AdminPromptTabs` | Speaking / Writing prompt tab switcher |
| `AdminSpeakingTaskDetail` | Prompt CRUD orchestrator (filter + table + modals) |
| `AdminWritingTaskDetail` | Same pattern for writing prompts |
| `SpeakingPromptsTable` | Data table with inline action menu |
| `PromptFormModal` | Create / edit prompt form (handles Task 5 JSON fields) |
| `PromptTableToolbar` | Client-side multi-filter controls |
| `CalibrationSampleTable` | AI calibration sample management |
| `PromptAnchorTable` | Anchor example management |

---

### `13_common_ui` — Shared UI Components
Location: `components/common/`

| Component | Purpose |
|-----------|---------|
| `TimerRing` | SVG countdown arc (prep/recording phases) |
| `ProcessingScreen` | AI analysis loading screen |
| `PaywallModal` | Quota-exhaustion upgrade modal |
| `TosGateModal` | Non-dismissable Terms of Service gate |
| `ConfirmModal` | Reusable confirmation dialog |
| `ScoreBadge` | Colour-coded band pill (emerald/amber/rose) |
| `StatusBadge` | Attempt status pill |
| `SkillBadge` | Speaking / Writing icon badge |
| `EmptyState` | Standard empty state layout |
| `PaginationFooter` | Page navigation with item count |

---

### `14_state_management` — Zustand + React Query

| Store / Hook | Purpose |
|-------------|---------|
| `practiceSessionStore` | Speaking practice session phases + timers |
| `mockExamStore` | Full 8-task exam phases + UUID dedup |
| React Query | All server data (user, quota, history, reports, prompts) |

**Key isolation rules:**
- `practiceSessionStore` ← never used by MockExamShell
- `mockExamStore` ← never used by SpeakingPracticeSession
- `AuthCacheGuard` ← wipes ALL cached queries on userId change
- Report data: `staleTime: Infinity` (immutable)

---

### `15_pages_routing` — App Router Structure

| Route Pattern | Handler |
|---------------|---------|
| `/` | Landing page (public) |
| `/(auth)/sign-in`, `/sign-up` | Clerk auth pages |
| `/(main)/dashboard` | Dashboard |
| `/(main)/speaking/[task]/[promptId]/practice` | Live speaking session |
| `/(main)/writing/[task]/[promptId]/practice` | Live writing session |
| `/(main)/practice/speaking/[testNumber]` | Mock exam shell |
| `/attempts/[id]/report` | AI score report |
| `/(main)/billing` | Billing & Plans |
| `/(main)/history` | Attempt history |
| `/(main)/progress` | Progress tracking |
| `/(main)/settings` | Account settings |
| `/admin/**` | Admin panel (role-gated) |

---

## Design System Tokens (Quick Reference)

| Token | Value |
|-------|-------|
| Background canvas | `bg-[#0D0F17]` |
| Surface (card) | `bg-surface` → `#161823` |
| Border | `border-border` → `white/[0.09]` |
| Card border (billing) | `border-white/[0.10]` hover → `white/[0.16]` |
| Primary accent | Amber `#F59E0B` (`amber-500`) |
| Success | Emerald `#10B981` |
| Danger | Rose `#F87171` |
| Font UI | `Inter` (`font-sans`) |
| Font Editor | `Source Serif 4` (`font-serif`) |
| Font Cart drawer | `font-light tracking-wide` |
| Band palette | ≥9 emerald · ≥6 amber · <6 rose |

---

## Critical Architecture Decisions

> These are the most important design choices to understand before modifying the codebase.

1. **`AuthCacheGuard`** — must remain in `Providers.tsx`. Removing it causes cross-user data leakage on shared devices.
2. **`key={phase}` in session shells** — forces full subtree remount on phase change. Removing it causes mic state to leak between recording phases.
3. **`examSessionId` in localStorage** — quota dedup for mock exam retakes. Never clear it without re-generating it.
4. **contenteditable in `WritingEditor`** — Tiptap/ProseMirror hard-code `spellcheck=false`; textarea can't overlay HTML. This is intentional.
5. **`SuccessHandler` null-render** — SSE fallback polling is here, not in `useBilling`. Moving it breaks the 3-poll fallback.
6. **`withNoInfoBar()`** — prevents double info bars in mock exam. All child screens that accept `showInfoBar` must suppress it when rendered inside `MockExamShell`.
7. **React Query `staleTime: Infinity` for reports** — report data is immutable (AI scores never change). Re-fetching wastes quota.
8. **`promptHasChanges()` in admin** — dirty-check before PATCH. Avoids unnecessary DB writes for no-op edits.

---

*Documentation generated May 2026. Maintained in `Document/frontend/`.*
