// ─────────────────────────────────────────────────────────────────────────────
// app/attempts/[id]/layout.tsx — Minimal layout for attempt status/report pages
//
// Uses the shared <Navbar /> so the header is pixel-identical to the rest of
// the app — same brand, same colours, same height, same padding.
// No sidebar — keeps the user focused on their result.
// Auth is enforced via Clerk middleware — no redirect needed here.
// ─────────────────────────────────────────────────────────────────────────────

import { Navbar } from "@/components/layout/Navbar";

/**
 * Authenticated layout for attempt status and report pages.
 * Intentionally sidebar-free to keep the user focused on their result,
 * but uses the identical <Navbar /> as the rest of the app.
 */
export default function AttemptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col items-stretch">{children}</main>
    </div>
  );
}
