"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReportPage.tsx — Report shell: fetches data, resolves plan, routes to layout
//
// Starter → StarterReport (score + locked sections + upgrade CTA)
// Pro / Ultra → ProReport (full coaching report)
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useReport }        from "@/lib/hooks/useReport";
import { useCurrentUser }   from "@/lib/hooks/useCurrentUser";
import { ReportSkeleton }   from "./ReportSkeleton";
import { StarterReport }    from "./StarterReport";
import { ProReport }        from "./ProReport";

interface Props {
  attemptId: string;
}

export function ReportPage({ attemptId }: Props) {
  const { report, isLoading: reportLoading, isError } = useReport(attemptId);
  const { user, isLoading: userLoading } = useCurrentUser();

  const isLoading = reportLoading || userLoading;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6"><BackLink /></div>
        <ReportSkeleton />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || !report) {
    return (
      <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-semibold text-foreground">Report not available</h2>
        <p className="text-subtle text-sm max-w-sm mx-auto">
          The report may still be generating. Wait a moment and refresh, or go
          back to your history.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <Link
            href="/history"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            View History
          </Link>
        </div>
      </div>
    );
  }

  // ── Resolve plan & target band ─────────────────────────────────────────────
  const plan       = user?.plan ?? "starter";
  const targetBand = user?.target_band ?? null;
  const isPro      = plan === "pro";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-6"><BackLink /></div>

      {isPro ? (
        <ProReport report={report} targetBand={targetBand} />
      ) : (
        <StarterReport report={report} />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/history"
      className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-amber-400 transition-colors group"
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      Back to History
    </Link>
  );
}
