# CELPIP PRO — Layout Components

**Author:** Senior Web Developer  
**Framework:** Next.js 14 (App Router), React 18  
**Location:** `apps/web/components/layout/`  
**Design System:** Dark navy (`#0D0F17`), amber-400 accent, glassmorphism borders

---

## 1. `Navbar.tsx` — Top Navigation Bar

**Type:** `"use client"` — uses Clerk auth hooks, `usePathname`, local state  
**Rendered in:** Root layout — present on every page

### Purpose
The primary navigation shell. Renders two distinct states based on Clerk auth
status: a **public bar** (Sign In + Get Started CTA) and an **authenticated bar**
(nav links + profile dropdown + mobile hamburger).

### Sub-Components (defined in same file)

#### `Brand`
Static logotype link to `/`. Two-tone: `CELPIP` in white, `BRO` in `amber-400`.
Mirrors exactly in `Footer` and `Sidebar` for brand consistency.

#### `PlanBadge`
Inline pill showing current user plan. Used in the profile dropdown trigger and
the dropdown header panel.

| Prop | Type | Description |
|------|------|-------------|
| `plan` | `"starter" \| "pro" \| "ultra" \| string` | Controls colour + label |
| `size` | `"xs" \| "sm"` | Controls padding and font size |

- **Starter:** `white/5` background, muted text
- **Pro:** amber-900/30 background, `amber-400` text
- **Ultra:** amber-900/40 background, `amber-300` text

#### `NavLinks`
Renders links from the `NAV_LINKS` constant (`lib/nav-links.ts`).
Active link detection via `pathname.startsWith(href)`. Active state renders
`amber-400` text + amber underline indicator via absolute-positioned `<span>`.

#### `ProfileDropdown`
Avatar + plan badge trigger button that opens a 264px-wide frosted-glass
dropdown panel. Click-outside detection via `mousedown` on `document`.

**Dropdown contains:**
- User avatar (Clerk `imageUrl`) or fallback `User2` icon
- Display name + email
- `PlanBadge` (full size)
- Settings link
- Sign out button → `clerk.signOut({ redirectUrl: "/" })`

### Main `Navbar` Logic

```
isLoaded && isSignedIn
    ↓ true  → show NavLinks (desktop lg+), ProfileDropdown, hamburger (mobile)
    ↓ false → show Terms/Privacy/Contact links, Sign In, Get Started CTA
```

| State | Desktop | Mobile |
|-------|---------|--------|
| Authenticated | NavLinks + ProfileDropdown | ProfileDropdown + Hamburger |
| Public | Terms/Privacy + Sign In + Get Started | Sign In + Get Started |

**Sticky header:** `position: sticky; top: 0; z-index: 50`  
**Backdrop blur:** `backdrop-blur-md bg-[#0D0F17]/95`

### Props
None — reads auth state internally via Clerk hooks.

### Key IDs (for browser testing)
- `#profile-dropdown-trigger` — avatar button
- `#profile-signout-btn` — sign out button
- `#mobile-menu-trigger` — hamburger button
- `#hero-cta-signup` — Get Started link (public)

---

## 2. `Sidebar.tsx` — Mobile Navigation Drawer

**Type:** `"use client"`  
**Rendered by:** `Navbar` (conditionally, auth users only)  
**Visibility:** `lg:hidden` — desktop uses `Navbar` nav links directly

### Purpose
Full-height slide-in navigation panel triggered by the hamburger button.
Renders a **backdrop overlay** + **drawer panel** as siblings inside a
`lg:hidden` wrapper.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controlled state owned by `Navbar` |
| `onClose` | `() => void` | Stable `useCallback` from `Navbar` — safe in `useEffect` deps |

### Behaviour

| Trigger | Effect |
|---------|--------|
| Route change (`pathname`) | Auto-calls `onClose()` |
| `open = true` | Adds `overflow-hidden` to `document.body` (scroll lock) |
| `open = false` | Removes scroll lock class |
| Backdrop click | Calls `onClose()` |
| X button click | Calls `onClose()` |

### Animation
CSS transform transition: `translate-x-0` (open) ↔ `-translate-x-full` (closed).  
Duration: 300ms, `ease-in-out`.

### Structure
- **Header:** Brand logotype + X close button
- **Main nav (`flex-1`, scrollable):** `NAV_LINKS` with active state styling
- **Bottom section:** `BOTTOM_NAV_LINKS` (Settings, etc.) + copyright footnote

### Active State
`bg-amber-500/10 text-amber-400 border border-amber-500/20` on active route.

---

## 3. `Providers.tsx` — Client Provider Tree

**Type:** `"use client"`  
**Rendered in:** Root layout, wraps all page content

### Purpose
Assembles all client-side React context providers in a single boundary.
Kept separate from `RootLayout` (Server Component) because React Context
requires a client boundary.

### Provider Stack (outer → inner)

```
QueryClientProvider
    ├── AuthCacheGuard        (null render — cache wipe on auth change)
    ├── PlanEventsWatcher     (null render — global SSE listener)
    ├── {children}
    └── <Toaster />           (Sonner toast renderer)
```

### `QueryClient` Configuration

| Option | Value | Reason |
|--------|-------|--------|
| `retry` | `1` | Surface errors quickly without hammering the API |
| `staleTime` | `30_000` ms | Conservative default; auth queries override individually |
| `refetchOnWindowFocus` | `true` | Prevents stale data when user returns to tab |

**Instance pattern:** `useRef<QueryClient>` — same instance reused across
renders, new instance created fresh per server request in SSR.

### `PlanEventsWatcher`
A null-render component that calls `usePlanEvents()` at the root level.
This ensures the SSE connection to `/billing/events` is opened on every
page — not just `/billing` — so the plan badge updates immediately after
a successful Stripe checkout from any page.

### Toaster (Sonner)
`position="bottom-right"`, `theme="dark"`, `richColors`, `closeButton`.
Custom `classNames` match the dark design system's `bg-surface`, `border-border`,
`rounded-xl` tokens.

---

## 4. `AuthCacheGuard.tsx` — Cross-User Cache Security Guard

**Type:** `"use client"` — null render (returns `null`)  
**Rendered in:** `Providers.tsx` (always mounted)

### Purpose
Prevents stale cached data from one user being served to another after
sign-out + sign-in in the same browser tab.

### Problem it solves
React Query's in-memory cache persists for the browser tab lifetime. Without
this guard, User B logging in after User A would see User A's plan, billing
status, and profile until the `staleTime` expired.

### Mechanism

```
useEffect watches: [isLoaded, clerkUser?.id]
    ↓
Previous userId (ref) ≠ current userId?
    → queryClient.clear()  // evict ALL cached queries in one shot
    → update ref to new userId
```

Handles all three auth transitions:
- `undefined → <id>` — sign in
- `<id> → undefined` — sign out
- `<id-A> → <id-B>` — account switch

### Key Properties
- **Zero renders** — returns `null`, no DOM output
- **No flash** — runs synchronously on userId change before next render cycle
- **Ref-based dedup** — `prevUserIdRef` prevents double-clearing on re-renders

---

## 5. `Footer.tsx` — Authenticated App Footer

**Type:** Server Component (no `"use client"`)  
**Rendered in:** Authenticated layout (`app/(main)/layout.tsx`)

### Purpose
Minimal single-bar footer: brand logotype + copyright notice + legal links
(Privacy, Terms, Contact). Same dark navy background as the Navbar for visual
continuity.

### Structure (horizontal, `sm:flex-row`)
- **Left:** `CELPIPBRO` logotype (same two-tone treatment as `Navbar`)
- **Centre:** Copyright + PARAGON disclaimer
- **Right:** Privacy / Terms / Contact links

### Design Notes
- `mt-auto` pushes the footer to the bottom of the page flex column
- `border-t border-white/[0.06]` — single hairline separator matching navbar
- Text colour `white/35` — deliberately low contrast (legal/secondary info)

---

## 6. `PageWrapper.tsx` — Authenticated Page Container

**Type:** Server Component

### Purpose
Thin wrapper that applies the standard `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
container constraint. Every authenticated page renders its content inside
`<PageWrapper>` to enforce consistent horizontal padding and max-width.

---

## 7. `BreadcrumbNav.tsx` — Contextual Breadcrumb

**Type:** `"use client"` — reads `usePathname()`

### Purpose
Renders a breadcrumb trail for deep navigation pages (e.g. speaking task →
prompt → report). Parses the current `pathname` and maps route segments to
human-readable labels using a static route map.

**Output example:**
```
Speaking → Task 3 → Attempt Report
```

---

## 8. `PlaceholderPage.tsx` — Coming Soon Placeholder

**Type:** Server Component

### Purpose
Reusable "coming soon" screen with a title, description, and optional CTA.
Used for unbuilt routes like `/writing/exam`, locked exam slots, and
future feature pages.

**Props:** `title`, `description`, `ctaLabel?`, `ctaHref?`
