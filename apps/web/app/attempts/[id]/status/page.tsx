// ─────────────────────────────────────────────────────────────────────────────
// app/attempts/[id]/status/page.tsx — Attempt processing / status page
//
// Polls the attempt status every 3 s via useAttemptStatus and renders the
// shared ProcessingScreen until scoring completes, then auto-redirects to
// /attempts/[id]/report.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata }         from "next";
import { AttemptStatusPageClient } from "@/components/attempts/AttemptStatusPageClient";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       "Processing Your Response",
  description: "Your CELPIP practice response is being analyzed by our AI. Results will appear here shortly.",
};

/**
 * Attempt status page — /attempts/[id]/status
 *
 * Server component shell. Passes the attempt ID to the client component
 * that owns the polling logic (useAttemptStatus).
 */
export default function AttemptStatusPage({ params }: PageProps) {
  return <AttemptStatusPageClient attemptId={params.id} />;
}
