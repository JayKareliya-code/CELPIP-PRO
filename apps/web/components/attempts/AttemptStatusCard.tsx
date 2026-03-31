// ─────────────────────────────────────────────────────────────────────────────
// AttemptStatusCard.tsx — Processing status card for the attempt status page
//
// Shows one of three states based on the attempt status:
//   processing → spinner + "Analyzing…" message
//   complete   → success icon + band score + link to report
//   failed     → error icon + retry message
//
// No polling logic here — the parent hook (useAttemptStatus) owns that.
// ─────────────────────────────────────────────────────────────────────────────

import Link                  from "next/link";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { StatusBadge }       from "@/components/common/StatusBadge";
import { ScoreBadge }        from "@/components/common/ScoreBadge";
import { cn }                from "@/lib/utils";
import type { AttemptStatusResponse } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface AttemptStatusCardProps {
  attempt:   AttemptStatusResponse | undefined;
  isLoading: boolean;
  isError:   boolean;
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function LoadingView() {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <div className="text-center space-y-1">
        <p className="text-base font-semibold text-foreground">
          Analyzing your response…
        </p>
        <p className="text-sm text-subtle">
          Our AI is evaluating your submission. This usually takes under a minute.
        </p>
      </div>
    </div>
  );
}

function CompleteView({ attempt }: { attempt: AttemptStatusResponse }) {
  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <CheckCircle2 className="w-12 h-12 text-success" />
      <div className="text-center space-y-1">
        <p className="text-base font-semibold text-foreground">Analysis complete!</p>
        <p className="text-sm text-subtle">
          Your {attempt.skill} response has been evaluated.
        </p>
      </div>
      {attempt.estimated_band != null && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-subtle uppercase tracking-wide font-medium">
            Estimated Band
          </p>
          <ScoreBadge band={attempt.estimated_band} size="lg" />
        </div>
      )}
      <Link
        href={`/attempts/${attempt.attempt_id}/report`}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                   bg-primary hover:bg-primary-hover text-white font-semibold text-sm
                   transition-colors duration-150 shadow-sm"
      >
        View Full Report
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function FailedView() {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <AlertCircle className="w-10 h-10 text-danger" />
      <div className="text-center space-y-1">
        <p className="text-base font-semibold text-foreground">Processing failed</p>
        <p className="text-sm text-subtle">
          Something went wrong while analyzing your response. Please try again.
        </p>
      </div>
      <Link
        href="/speaking"
        className="px-5 py-2 rounded-lg border border-border text-sm font-medium
                   text-foreground hover:bg-muted transition-colors"
      >
        Back to Speaking Tasks
      </Link>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Status card showing the current state of an attempt:
 * loading → processing → complete (with report link) or failed.
 */
export function AttemptStatusCard({
  attempt,
  isLoading,
  isError,
}: AttemptStatusCardProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-2xl border border-border shadow-panel p-6",
        "w-full max-w-md"
      )}
    >
      {/* Status badge header */}
      {attempt && (
        <div className="flex justify-between items-start mb-4">
          <p className="text-xs text-subtle uppercase tracking-wide font-medium">
            {attempt.skill === "speaking" ? "Speaking" : "Writing"} Attempt
          </p>
          <StatusBadge status={attempt.status} />
        </div>
      )}

      {/* Body view based on status */}
      {isLoading && !attempt && <LoadingView />}
      {isError && <FailedView />}
      {attempt?.status === "processing" && <LoadingView />}
      {attempt?.status === "pending"    && <LoadingView />}
      {attempt?.status === "complete"   && <CompleteView attempt={attempt as AttemptStatusResponse} />}
      {attempt?.status === "failed"     && <FailedView />}
    </div>
  );
}
