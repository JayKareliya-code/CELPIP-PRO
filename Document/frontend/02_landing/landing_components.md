# CELPIP PRO — Landing Page Components

**Author:** Senior Web Developer  
**Framework:** Next.js 14, React Server Components  
**Location:** `apps/web/components/landing/`  
**Page:** `app/page.tsx` (root `/` route — public, no auth required)

---

## 1. `HeroSection.tsx` — Above-the-Fold Hero

**Type:** Server Component  
**Section ID:** `#hero`

### Purpose
The first thing a visitor sees. Communicates the platform's value proposition
in two columns: **left — copy + CTAs**, **right — feature preview cards + stats**.

### Structure

#### Left Column (copy)
- **Label pill:** `"AI-Scored CELPIP Practice"` with `ClipboardCheck` icon — amber accent
- **H1:** Split heading with gradient highlight (`from-primary to-indigo-400`) on
  `"Target CELPIP Band"`
- **Subtext:** 2-sentence value description
- **CTA row:**
  - Primary: `Start Free` → `/sign-up` (amber background, `ArrowRight` icon)
  - Secondary: `See Plans` → `#pricing` (outlined, ghost style)
- **Trust chips:** `"Free mock test included"`, `"One-time payment"`,
  `"Independent CELPIP practice platform"` — small rounded pills

#### Right Column (feature preview, hidden on mobile `hidden sm:block`)
- **Speaking card:** Mic icon + "8 CELPIP Task Types" description
- **Writing card:** PenLine icon + "Email & Opinion Response" description
- **Stats row:** 3-up grid — `8` Speaking tasks, `2` Writing tasks, `Free` to start
- **Quote card:** `BookOpen` icon + one-line practice philosophy

### Responsive Behaviour
- Mobile: Single column, centered text
- `lg+`: Two-column grid (`grid-cols-1 lg:grid-cols-2`), left-aligned text
- Right column: `hidden sm:block` — not shown on small screens

### Key IDs
- `#hero-cta-signup` — primary "Start Free" button
- `#hero-cta-pricing` — "See Plans" button

### Constants used
- `SPEAKING_TASK_COUNT = 8`
- `WRITING_TASK_COUNT = 2`

---

## 2. `FeaturesGrid.tsx` — Platform Features Grid

**Type:** Server Component  
**Section ID:** `#features`

### Purpose
An 8-card `4×2` grid showcasing all platform features. Each card has a coloured
icon, title, 3 bullet points, and a plan availability tag.

### Data Structure

```typescript
interface Feature {
  icon:      React.ReactNode;   // Lucide icon with colour class
  title:     string;
  bullets:   string[];          // 3 bullet points max
  accent:    string;            // Icon background colour class
  tag?:      string;            // "All Plans" | "Paid Plans" | "Coming Soon"
  tagColor?: string;            // Tailwind colour classes for the tag pill
}
```

### Features Defined

| Feature | Icon | Tag |
|---------|------|-----|
| 8 Speaking Task Types | `Mic` (primary) | All Plans |
| 2 Writing Task Types | `PenLine` (success) | All Plans |
| Full Speaking & Writing Mocks | `ClipboardCheck` (indigo) | Paid Plans |
| AI Feedback by Dimension | `BrainCircuit` (cyan) | Paid Plans |
| Vocab, Connectors & Templates | `BookOpenCheck` (warning) | Paid Plans |
| Exam-Style Timing | `Clock` (rose) | All Plans |
| Advanced Analytics | `BarChart3` (purple) | Coming Soon |
| Deeper Rewrite Drills | `Lightbulb` (emerald) | Coming Soon |

### Card Interaction
`group card-interactive` — on hover: icon container scales `group-hover:scale-110`
via `transition-transform duration-200`. Hover lift effect via design system
`card-interactive` CSS class.

### Layout
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` — responsive from 1 to 4 columns.

---

## 3. `PricingPreview.tsx` — Pricing Plans Section

**Type:** Server Component  
**Section ID:** `#pricing`  
**Data source:** `lib/constants.ts` — `PLAN_PRICING`, `PRO_PLAN_LIMITS`, `ULTRA_PLAN_LIMITS`

### Purpose
The primary conversion section. Renders 3 plan cards (Starter / Pro / Ultra)
with feature lists, pricing, and CTAs. The Pro card is visually elevated
(`scale-[1.02]`, `shadow-[0_0_50px_rgba(99,102,241,0.15)]`).

### Plan Data Schema

```typescript
interface Plan {
  id:          string;
  name:        string;
  tagline:     string;
  priceLabel:  string;          // e.g. "Free", "$49"
  priceNote:   string;          // e.g. "One-time · no subscription"
  icon:        React.ReactNode;
  iconBg:      string;
  features:    PlanFeature[];
  cta:         string;
  ctaHref:     string;
  highlighted: boolean;         // Pro = true → visual elevation
  comingSoon?: boolean;         // Ultra = true → CTA disabled
  badge?:      string;          // Corner ribbon text
  badgeColor?: string;
}

interface PlanFeature {
  text:       string;
  included:   boolean;          // true → ✓ green / false → ✗ muted
  highlight?: boolean;          // true → bold foreground text
}
```

### Plan Cards Rendered

| Plan | Highlighted | CTA | Badge |
|------|------------|-----|-------|
| Starter | No | `Start Free` → `/sign-up` | — |
| Pro | **Yes** | `Unlock Pro` → `/sign-up?plan=pro` | `Live Now` (primary) |
| Ultra | No | `Coming Soon` (disabled `div`) | `Coming Soon` (warning) |

### Feature Counts (dynamically computed from constants)
```typescript
PRO_SPEAKING_PRACTICES = 8 tasks × PRO_PLAN_LIMITS.speaking_attempts_per_task
PRO_WRITING_PRACTICES  = 2 tasks × PRO_PLAN_LIMITS.writing_attempts_per_task
```
This ensures the landing page stays in sync when limits change in `lib/constants.ts`.

### Responsive Layout
- **Mobile:** Horizontal scroll with `snap-x snap-mandatory`, each card `80vw`
- **sm+:** `grid-cols-3`, cards full-width, Pro card elevated

### Comparison Notes Panel
Below the cards: 3-column horizontal panel (`sm:divide-x`) with:
- `Starter vs Pro` — plan difference explanation
- `Why One-Time?` — pricing model justification
- `Ultra` — coming soon waitlist message

### Key IDs
- `#plan-starter` / `#plan-pro` / `#plan-ultra` — plan card wrappers
- `#plan-cta-starter` / `#plan-cta-pro` / `#plan-cta-ultra` — CTA buttons

---

## 4. `TestimonialsSection.tsx` — Social Proof

**Type:** Server Component  
**Section ID:** `#testimonials`

### Purpose
Displays 4–6 user testimonials in a responsive grid. Each card shows a
star rating, quote, user name, and CELPIP score context.

### Card Structure
- Star rating (5★ — filled `amber-400`)
- Quote text (italic, `text-subtle`)
- User: display name + role label (e.g. `"Got Band 9 in Speaking"`)

### Layout
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — responsive 1→2→3 columns.

---

## 5. `HowItWorksSection.tsx` — Steps Explainer

**Type:** Server Component  
**Section ID:** `#how-it-works`

### Purpose
3-step numbered walkthrough explaining the platform flow:
1. Choose a task and practice with exam-style timing
2. Submit and receive AI-scored feedback
3. Review your band, track progress, improve

### Step Card Structure
- Large step number (`01`, `02`, `03`) in `primary/20` background
- Icon from Lucide
- Title + 1-sentence description

### Layout
`grid-cols-1 sm:grid-cols-3` with connecting lines between steps on desktop.

---

## Landing Page Composition

All sections are assembled in `app/page.tsx` in this order:

```tsx
<Navbar />                  // sticky — from layout
<HeroSection />             // #hero
<FeaturesGrid />            // #features
<HowItWorksSection />       // #how-it-works
<TestimonialsSection />     // #testimonials
<PricingPreview />          // #pricing
<Footer />                  // from layout
```

### SEO (configured in `app/page.tsx` metadata export)

```typescript
export const metadata: Metadata = {
  title: "CELPIPBRO — AI-Powered CELPIP Speaking & Writing Practice",
  description: "Practice every CELPIP Speaking and Writing task with timed sessions, AI scoring aligned to official criteria, and detailed feedback. Start free.",
  openGraph: { ... },
  twitter: { ... },
};
```

### Performance Notes
- All landing components are **Server Components** — zero client JS bundle cost
- Images use Next.js `<Image>` with `priority` on above-fold assets
- Animations: `animate-fade-in` CSS class (no JS animation library)
- `animation-delay-150` utility for staggered right-column entrance on hero
