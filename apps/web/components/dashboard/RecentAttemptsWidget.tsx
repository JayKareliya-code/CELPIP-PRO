// ─────────────────────────────────────────────────────────────────────────────
// RecentAttemptsWidget.tsx — Dashboard widget showing last 3 attempts
//
// Phase 2: "View" link added for complete attempts → routes to /attempts/[id]/report
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HistoryPage } from "../history/HistoryPage";

/**
 * Dashboard widget — shows the last 3 attempts in a compact table.
 * Receives attempts as props (data sourced from mock or API in parent).
 * Phase 2: "View" link in the Action column deep-links to the full report.
 */

export function RecentAttemptsWidget() {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-card p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">
          Recent Attempts
        </h2>
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <HistoryPage></HistoryPage>
    </div>
  );
}
