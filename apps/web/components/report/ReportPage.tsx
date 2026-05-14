"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReportPage.tsx — Report shell: fetches data, resolves plan, routes to layout
//
// Both Starter and Pro now render through ProReport.
// isPro=false → advanced sections replaced with LockedSection overlays.
// isPro=true  → full coaching report with all analytics.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useReport }        from "@/lib/hooks/useReport";
import { useCurrentUser }   from "@/lib/hooks/useCurrentUser";
import { ReportSkeleton }   from "./ReportSkeleton";
import { ProReport }        from "./ProReport";

interface Props {
  attemptId: string;
}

export function ReportPage({ attemptId }: Props) {
  const { report, isLoading: reportLoading, isError } = useReport(attemptId);
  const { user, isLoading: userLoading } = useCurrentUser();
  const searchParams = useSearchParams();

  // Where to send the user when they click the back button.
  // Defaults to /history but respects ?from= set by the calling page.
  const ALLOWED_BACK = ["/progress", "/history", "/dashboard"];
  const rawFrom = searchParams.get("from") ?? "";
  const backHref  = ALLOWED_BACK.includes(rawFrom) ? rawFrom : "/history";
  const backLabel = backHref === "/progress"
    ? "Back to Progress"
    : backHref === "/dashboard"
    ? "Back to Dashboard"
    : "Back to History";

  const isLoading = reportLoading || userLoading;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6"><BackLink href={backHref} label={backLabel} /></div>
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

  // ── Resolve target band + access gate ──────────────────────────────────────
  // The report payload carries an explicit `access` object that tells the UI
  // which sections to render as locked. We prefer that over reading the user's
  // plan client-side because:
  //   1. It stays in sync with what the backend actually returned (no race
  //      between current-user and report cache invalidation on upgrade).
  //   2. The server is the single source of truth for entitlement.
  //
  // Fallback (`access` missing) keeps the page working during a rolling
  // deploy where the frontend ships before the backend.
  const targetBand = user?.target_band ?? null;
  const plan       = user?.plan ?? "starter";
  const isPro      = report.access?.has_full_report ?? (plan === "pro" || plan === "ultra");

  // ── Render ─────────────────────────────────────────────────────────────────
  // Both plans use the same ProReport shell — Starter sees locked sections
  // in place of advanced features rather than the old split-screen layout.
  return (
    <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-6"><BackLink href={backHref} label={backLabel} /></div>

      <ProReport report={report} targetBand={targetBand} isPro={isPro} />
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-amber-400 transition-colors group"
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}
