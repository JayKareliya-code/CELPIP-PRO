# CELPIP PRO — Pages & Routing

**Author:** Senior Web Developer  
**Framework:** Next.js 14 App Router  
**Location:** `apps/web/app/`

---

## Route Groups & Layout Strategy

```
app/
├── layout.tsx                  ← Root layout: fonts, ClerkProvider, Providers
├── page.tsx                    ← Landing page (public)
├── (auth)/                     ← Auth route group (no navbar)
│   ├── sign-in/                ← Clerk sign-in page
│   └── sign-up/                ← Clerk sign-up page
├── (main)/                     ← Authenticated main app (Navbar + layout)
│   ├── layout.tsx              ← Navbar + Footer + PageWrapper shell
│   ├── dashboard/              ← /dashboard
│   ├── speaking/               ← /speaking + /speaking/[task]
│   ├── writing/                ← /writing + /writing/[task]
│   ├── practice/               ← /practice (mock exam hub)
│   ├── billing/                ← /billing
│   ├── history/                ← /history
│   ├── progress/               ← /progress
│   ├── settings/               ← /settings
│   └── account/                ← /account
├── admin/                      ← Admin panel (AdminSidebar layout)
│   ├── layout.tsx              ← Admin shell + role guard
│   ├── page.tsx                ← /admin (overview)
│   ├── prompts/                ← /admin/prompts
│   ├── calibration/            ← /admin/calibration
│   ├── assets/                 ← /admin/assets
│   ├── materials/              ← /admin/materials
│   ├── tags/                   ← /admin/tags
│   ├── audit/                  ← /admin/audit
│   └── cost-report/            ← /admin/cost-report
├── attempts/
│   └── [id]/
│       └── report/             ← /attempts/{id}/report
├── contact/                    ← /contact
├── privacy/                    ← /privacy
└── terms/                      ← /terms
```

---

## 1. Root Layout (`app/layout.tsx`)

**Type:** Server Component  
**Wraps:** All pages (auth + main + admin)

### Fonts
- `Inter` (`--font-inter`) — UI sans-serif
- `Source Serif 4` (`--font-source-serif`) — writing editor body text

### SEO Metadata (from `metadata` export)

| Field | Value |
|-------|-------|
| `title.default` | `"CELPIPBRO - AI-Powered CELPIP Practice"` |
| `title.template` | `"%s \| CELPIPBRO"` |
| `metadataBase` | `process.env.NEXT_PUBLIC_SITE_URL` |
| `description` | Practice speaking/writing with AI feedback + band estimates |
| `keywords` | 12 CELPIP-related terms |
| `openGraph.type` | `"website"`, `en_CA` locale |
| `twitter.card` | `"summary_large_image"` |
| Google verification | Search Console verification meta tag |

### Body
```html
<html lang="en" class="{inter} {sourceSerif} dark">
  <body class="min-h-screen flex flex-col bg-muted font-sans antialiased">
    <Providers>{children}</Providers>
  </body>
</html>
```

---

## 2. Landing Page (`app/page.tsx`)

**URL:** `/`  
**Type:** Server Component  
**Auth:** Public

### Page Structure
```
<Navbar /> (public variant)
<HeroSection />
<FeaturesGrid />
<PricingPreview />
<Footer />
```

---

## 3. `(main)` Route Group Layout

**File:** `app/(main)/layout.tsx`  
**Type:** Server Component  
**Auth:** Clerk `auth()` — redirects to `/sign-in` if not authenticated  
**Renders:** `<Navbar />` + `<main>` content area + `<Footer />`

All authenticated user-facing pages live under this group.

---

## 4. Speaking Routes

### `/speaking` — Module Home
**File:** `app/(main)/speaking/page.tsx`  
**Type:** Server Component  
**Data:** `GET /api/v1/speaking/tasks` (cached `revalidate: 300`)  
**Client:** `<SpeakingModuleHome tasks={tasks} />`

### `/speaking/[task]` — Task Detail
**File:** `app/(main)/speaking/[task]/page.tsx`  
**Params:** `task` = task number (1–8 or `"practice"`)  
**Data:** Fetches available prompts for this task server-side  
**Client:** Task info page + "Start Practice" link

### `/speaking/[task]/[promptId]/practice` — Live Session
**File:** `app/(main)/speaking/[task]/[promptId]/practice/page.tsx`  
**Type:** Server Component → client boundary  
**Auth guard:** Quota check — 402 redirect to `/billing` if exhausted  
**Client:** `<SpeakingPracticeSession task={task} />`  
**Layout:** Full-screen canvas (no Navbar during active session)

### `/speaking/[task]/tips`
Quick reference tips for the selected task type. Static content.

---

## 5. Writing Routes

### `/writing` — Module Home
**File:** `app/(main)/writing/page.tsx`  
**Type:** Server Component  
**Data:** `GET /api/v1/writing/tasks` (cached)  
**Client:** `<WritingModuleHome tasks={tasks} />`

### `/writing/[task]` — Task Detail
**File:** `app/(main)/writing/[task]/page.tsx`  
**Params:** `task` = `1` or `2`  
**Client:** Task info page + "Start Practice" link

### `/writing/[task]/[promptId]/practice` — Live Session
**File:** `app/(main)/writing/[task]/[promptId]/practice/page.tsx`  
**Auth guard:** Quota check  
**Client:** `<WritingPracticeSession task={task} />`  
**Layout:** Full-screen canvas

### `/writing/[task]/instruction`
Writing task instructions and exam format overview.

---

## 6. Practice (Mock Exam) Routes

### `/practice` — Mock Exam Hub
**File:** `app/(main)/practice/page.tsx`  
**Type:** Server Component  
**Client:** Exam slot selection grid — shows available mock exam slots

### `/practice/speaking/[testNumber]` — Mock Exam Session
**File:** `app/(main)/practice/speaking/[testNumber]/page.tsx`  
**Params:** `testNumber` = slot number (1, 2, …)  
**Auth guard:** Plan check — Pro/Ultra required  
**Client:** `<MockExamShell slotNumber={testNumber} />`  
**Layout:** Full-screen exam canvas (no Navbar)

### `/practice/writing`
Writing mock exam (planned — same pattern as speaking).

### `/practice/[skill]`
Generic skill-level practice hub redirector.

---

## 7. Attempts / Report Route

### `/attempts/[id]/report`
**File:** `app/attempts/[id]/report/page.tsx`  
**Params:** `id` = attempt UUID  
**Type:** Server Component → client boundary  
**Data:** Validates attempt ownership server-side  
**Client:** `<ReportPage attemptId={id} />`  
→ branches to `<ProReport>` or `<StarterReport>` based on `report.plan`

---

## 8. Billing Route

### `/billing`
**File:** `app/(main)/billing/page.tsx`  
**Type:** Server Component — reads `searchParams.success`, `searchParams.canceled`, `searchParams.plan`  
**Client:** `<BillingPageClient success canceled planParam />`

---

## 9. History Route

### `/history`
**File:** `app/(main)/history/page.tsx`  
**Type:** Server Component  
**Client:** `<HistoryPage />` (manages Practice / Mock view tabs internally)

---

## 10. Progress Route

### `/progress`
**File:** `app/(main)/progress/page.tsx`  
**Type:** Server Component  
**Client:** `<ProgressPageClient />` (gates Starter users)

---

## 11. Settings Route

### `/settings`
**File:** `app/(main)/settings/page.tsx`  
**Type:** Server Component  
**Client:** `<SettingsPageClient />` — renders `SettingsNav` + active tab content

---

## 12. Dashboard Route

### `/dashboard`
**File:** `app/(main)/dashboard/page.tsx` (also aliased via `app/dashboard/`)  
**Type:** Server Component  
**Client:** `<DashboardPageClient />` — renders `WelcomeBanner`, `DashboardStatusRow`, `QuickStartCard`, `RecentAttemptsCompact`

---

## 13. Admin Routes (`app/admin/`)

**Layout:** `app/admin/layout.tsx` — checks Clerk `auth()` session + `admin` role claim. Hard-redirects non-admins to `/dashboard`.

### Route → Page Map

| Route | Page |
|-------|------|
| `/admin` | Overview dashboard — user counts, attempt stats, cost summary |
| `/admin/prompts` | `AdminPromptTabs` — speaking/writing prompt management |
| `/admin/prompts/speaking/[task]` | `AdminSpeakingTaskDetail` |
| `/admin/prompts/writing/[task]` | `AdminWritingTaskDetail` |
| `/admin/calibration` | Calibration samples + anchor management |
| `/admin/assets` | Media asset library (S3 image browser) |
| `/admin/materials` | Study material management |
| `/admin/tags` | Prompt tag management |
| `/admin/audit` | Audit log viewer |
| `/admin/cost-report` | AI API cost breakdown by model/skill |

---

## 14. Auth Routes (`(auth)`)

| Route | Component |
|-------|-----------|
| `/sign-in/[[...sign-in]]` | Clerk `<SignIn>` component |
| `/sign-up/[[...sign-up]]` | Clerk `<SignUp>` component |

No Navbar — standalone centered card layout.

---

## 15. Public Static Routes

| Route | Content |
|-------|---------|
| `/privacy` | Privacy policy |
| `/terms` | Terms of Service |
| `/contact` | Contact form |

---

## 16. SEO Infrastructure

### `robots.ts`
```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

### `sitemap.ts`
Generates XML sitemap including: `/`, `/speaking`, `/writing`, `/practice`,
`/speaking/[1-8]`, `/writing/[1-2]`.  
Excludes: auth pages, admin, user-specific report URLs.

---

## 17. Next.js Configuration Notes

| Config | Value |
|--------|-------|
| Framework | Next.js 14 App Router |
| Auth | Clerk Next.js SDK (middleware + `auth()`) |
| Fonts | `next/font/google` — `Inter`, `Source Serif 4` |
| CSS | Vanilla CSS + Tailwind CSS v3 |
| Image optimisation | `next/image` with S3 remote patterns |
| Environment | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLERK_*`, `NEXT_PUBLIC_API_URL` |
| Monorepo | Turborepo — `apps/web` package |

---

## 18. Middleware (`middleware.ts`)

**Location:** `apps/web/middleware.ts`

```typescript
// Clerk auth middleware — public routes bypass, everything else requires session
export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) return;
  auth().protect();                    // → /sign-in if unauthenticated
});

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)",
  "/privacy", "/terms", "/contact", "/api/webhooks/stripe", "/api/billing/events"]);
```

SSE endpoint (`/api/billing/events`) is public — Clerk session is verified
inside the endpoint handler, not at middleware layer, to avoid streaming
interruption.
