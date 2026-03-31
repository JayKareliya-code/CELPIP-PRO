// ─────────────────────────────────────────────────────────────────────────────
// app/attempts/[id]/layout.tsx — Minimal layout for attempt status/report pages
//
// These pages sit OUTSIDE the (main) route group so they get a minimal
// chrome (logo-only navbar) instead of the full sidebar layout.
// Auth is enforced via Clerk middleware — no redirect needed here.
// ─────────────────────────────────────────────────────────────────────────────

import Link                  from "next/link";
import { BookOpen }          from "lucide-react";
import { ROUTES }            from "@/lib/constants";

/**
 * Minimal authenticated layout for attempt status and report pages.
 * No sidebar — keeps the user focused on their result.
 */
export default function AttemptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-muted">
      {/* Minimal header — logo only */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link
            href={ROUTES.dashboard}
            className="flex items-center gap-2 text-sm font-bold text-foreground
                       hover:text-primary transition-colors"
            aria-label="Go to dashboard"
          >
            <BookOpen className="w-5 h-5 text-primary" />
            <span>CELPIP Prep</span>
          </Link>

          {/* Dashboard link */}
          <Link
            href={ROUTES.dashboard}
            className="text-xs text-subtle hover:text-foreground transition-colors
                       font-medium"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
