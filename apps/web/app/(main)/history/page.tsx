// ─────────────────────────────────────────────────────────────────────────────
// app/(main)/history/page.tsx — Practice History page (Phase 2)
//
// Replaces the Phase 1 mock-data stub with the live HistoryPage client
// component backed by useHistory → GET /api/v1/history.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata }   from "next";
import { HistoryPage }     from "@/components/history/HistoryPage";

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       "Practice History — CELPIP Prep",
  description: "Review all your past speaking and writing attempts, band scores, and AI feedback.",
  robots:      { index: false },
};

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * History page — /history
 *
 * Inherits Navbar + Sidebar + Footer from (main)/layout.tsx.
 * Thin server-component shell: <HistoryPage /> owns all client-side state
 * (skill filter, pagination, TanStack Query data fetching).
 */
export default function HistoryRoutePage() {
  return <HistoryPage />;
}
