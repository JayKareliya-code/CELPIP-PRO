// ─────────────────────────────────────────────────────────────────────────────
// app/attempts/[id]/report/page.tsx — Full AI feedback report page
//
// ReportPage is a client component that:
//   - Calls useReport → GET /attempts/{id}/report
//   - Reads ?from= search param to resolve the back-link destination
//     (e.g. /progress → "Back to Progress", /history → "Back to History")
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense }     from "react";
import type { Metadata } from "next";
import { ReportPage }  from "@/components/report/ReportPage";
import { ReportSkeleton } from "@/components/report/ReportSkeleton";

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

// ── Page (Server Component shell) ─────────────────────────────────────────────
//
// Wrapped in <Suspense> because ReportPage calls useSearchParams(), which
// requires a Suspense boundary in Next.js App Router when used in a page
// that is otherwise a server component.

export default function AttemptReportPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <ReportSkeleton />
      </div>
    }>
      <ReportPage attemptId={params.id} />
    </Suspense>
  );
}
