// ─────────────────────────────────────────────────────────────────────────────
// app/attempts/[id]/report/page.tsx — Full AI feedback report page (Phase 2)
//
// Replaces the Phase 1 ReportPlaceholder stub with the real ReportPage shell.
// ReportPage is a client component that calls useReport → GET /attempts/{id}/report.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { ReportPage }   from "@/components/report/ReportPage";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export function generateMetadata(): Metadata {
  return {
    title:       `Attempt Report — CELPIP Prep`,
    description: "View your AI-generated feedback, band score estimate, and dimension breakdown for this CELPIP practice attempt.",
    robots:      { index: false },  // reports are private — do not index
  };
}

// ── Page (Server Component shell — ReportPage is client) ─────────────────────

/**
 * Attempt report page — /attempts/[id]/report
 *
 * This is a thin server-component shell. All data fetching happens inside
 * <ReportPage /> via TanStack Query (useReport hook) so we get client-side
 * loading/error states, skeleton UI, and stale-while-revalidate caching.
 */
export default function AttemptReportPage({ params }: PageProps) {
  return <ReportPage attemptId={params.id} />;
}
