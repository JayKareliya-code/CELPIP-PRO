"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReportPage.tsx — Full report shell that wires all sub-components together
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useReport }               from "@/lib/hooks/useReport";
import { ScoreSummaryCard }        from "./ScoreSummaryCard";
import { DimensionBreakdown }      from "./DimensionBreakdown";
import { StrengthsPanel, WeaknessesPanel } from "./FeedbackPanels";
import { ImprovementTipsAccordion } from "./ImprovementTipsAccordion";
import { SampleResponseCard }      from "./SampleResponseCard";
import { TranscriptCard }          from "./TranscriptCard";
import { ReportSkeleton }          from "./ReportSkeleton";

interface Props {
  attemptId: string;
}

export function ReportPage({ attemptId }: Props) {
  const { report, isLoading, isError } = useReport(attemptId);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl w-full px-4 py-8">
        <div className="mb-6">
          <BackLink />
        </div>
        <ReportSkeleton />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || !report) {
    return (
      <div className="mx-auto max-w-3xl w-full px-4 py-16 text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-semibold text-white">Report not available</h2>
        <p className="text-subtle text-sm max-w-sm mx-auto">
          The report may still be generating. Wait a moment and refresh, or go back to your history.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-white hover:bg-white/5 transition-colors"
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

  // ── Loaded ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-5 animate-fade-in">
      {/* Back nav */}
      <BackLink />

      {/* 1 — Score summary + arc gauge */}
      <ScoreSummaryCard
        estimatedBand={report.estimated_band}
        skill={report.skill}
        taskTitle={report.task_title}
        completedAt={report.completed_at}
      />

      {/* 2 — Dimension breakdown */}
      <DimensionBreakdown dimensions={report.dimensions} />

      {/* 3 — Strengths + Weaknesses grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StrengthsPanel  items={report.strengths}  />
        <WeaknessesPanel items={report.weaknesses} />
      </div>

      {/* 4 — Improvement tips accordion */}
      <ImprovementTipsAccordion tips={report.improvement_tips} />

      {/* 5 — Sample response (collapsible, closed by default) */}
      <SampleResponseCard sampleResponse={report.sample_response} />

      {/* 6 — Transcript (speaking only, collapsible) */}
      {report.skill === "speaking" && report.transcript && (
        <TranscriptCard transcript={report.transcript} />
      )}

      {/* Footer CTA */}
      <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">Keep practising to improve your score</p>
          <p className="text-xs text-subtle mt-0.5">Consistent practice is the fastest path to Band 10+</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/history"
            className="rounded-xl border border-border bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/5 transition-colors"
          >
            My History
          </Link>
          <Link
            href={`/${report.skill}`}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Practice Again →
          </Link>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/history"
      className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-white transition-colors group"
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      Back to History
    </Link>
  );
}
