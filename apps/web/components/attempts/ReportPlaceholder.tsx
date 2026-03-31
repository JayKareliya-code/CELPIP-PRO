// ─────────────────────────────────────────────────────────────────────────────
// ReportPlaceholder.tsx — Phase 1 stub for the full feedback report
//
// Shown on /attempts/[id]/report until the backend is wired in Phase 2.
// Displays the attempt details (skill, band, dimensions) from the Attempt
// object if available, otherwise shows a friendly "coming in Phase 2" card.
// ─────────────────────────────────────────────────────────────────────────────

import Link               from "next/link";
import { FileText, Mic, PenLine, ArrowLeft } from "lucide-react";
import { ScoreBadge }     from "@/components/common/ScoreBadge";
import { SkillBadge }     from "@/components/common/SkillBadge";
import { cn }             from "@/lib/utils";
import type { Attempt }   from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReportPlaceholderProps {
  attempt?: Attempt;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Phase 1 report placeholder — shows available attempt metadata
 * (skill, band, dimensions if present) and a clear "full report coming" notice.
 *
 * In Phase 2 this component is replaced by the detailed ReportPage component.
 */
export function ReportPlaceholder({ attempt }: ReportPlaceholderProps) {
  const SkillIcon = attempt?.skill === "writing" ? PenLine : Mic;

  return (
    <div className="max-w-xl w-full space-y-6">
      {/* Back link */}
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-sm text-subtle
                   hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Attempt History
      </Link>

      {/* Main card */}
      <div className="bg-surface rounded-2xl border border-border shadow-panel p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full
                          bg-primary/10 border border-primary/20">
            <SkillIcon className="w-7 h-7 text-primary" />
          </div>
        </div>

        {/* Title & skill */}
        {attempt && (
          <div className="space-y-2 mb-6">
            <div className="flex justify-center">
              <SkillBadge skill={attempt.skill} />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {attempt.task_title}
            </h1>
            {attempt.estimated_band !== null && attempt.estimated_band !== undefined && (
              <div className="flex flex-col items-center gap-1 mt-3">
                <p className="text-xs text-subtle uppercase tracking-wide font-medium">
                  Estimated Band Score
                </p>
                <ScoreBadge band={attempt.estimated_band} size="lg" />
              </div>
            )}
          </div>
        )}

        {/* Dimension scores (if available) */}
        {attempt?.feedback?.dimensions && attempt.feedback.dimensions.length > 0 && (
          <div className="mb-6 text-left space-y-2">
            <p className="text-xs text-subtle uppercase tracking-wide font-semibold mb-3">
              Dimension Breakdown
            </p>
            {attempt.feedback.dimensions.map((dim) => (
              <div key={dim.label} className="flex items-center justify-between
                                              py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{dim.label}</span>
                <ScoreBadge band={dim.score} size="sm" />
              </div>
            ))}
          </div>
        )}

        {/* Phase 2 notice */}
        <div className={cn(
          "rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5",
          attempt?.feedback ? "mt-4" : "mt-0"
        )}>
          <FileText className="w-8 h-8 text-primary/60 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">
            Detailed Report — Coming in Phase 2
          </p>
          <p className="text-xs text-subtle leading-relaxed">
            The full report with transcript, annotated feedback, vocabulary
            suggestions, and model answer comparisons will be available once
            the AI evaluation backend is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
