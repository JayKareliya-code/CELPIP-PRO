"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ProReport.tsx — Split-screen report layout for Pro / Ultra plan users
//
// LEFT  — Question prompt + user's response (essay or transcript)
// RIGHT — Score gauge, dimension breakdown, strengths/weaknesses,
//         improvement tips, sample response
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ResponsePanel }                  from "./ResponsePanel";
import { ScoreSummaryCard }               from "./ScoreSummaryCard";
import { DimensionBreakdown }             from "./DimensionBreakdown";
import { StrengthsPanel, WeaknessesPanel } from "./FeedbackPanels";
import { ImprovementTipsAccordion }       from "./ImprovementTipsAccordion";
import { SampleResponseCard }             from "./SampleResponseCard";

import type { ReportResponse }            from "@/lib/types";

interface Props {
  report:     ReportResponse;
  targetBand: number | null;
}

export function ProReport({ report, targetBand }: Props) {
  return (
    <div className="flex flex-col gap-5">

      {/* ── Split-screen body ──────────────────────────────────────────────── */}
      {/*
        Mobile:  score/feedback first (order-1), then question/response (order-2)
        Desktop: question/response LEFT (lg:order-1), score/feedback RIGHT (lg:order-2)
      */}
      <div className="flex flex-col lg:flex-row gap-5 lg:items-start">

        {/* Score + All rubric details — ORDER 1 on mobile, ORDER 2 (right) on desktop */}
        <div className="flex-1 flex flex-col gap-4 order-1 lg:order-2">

          {/* Score summary */}
          <ScoreSummaryCard
            estimatedBand={report.estimated_band}
            skill={report.skill}
            completedAt={report.completed_at}
          />

          {/* Rubric dimension breakdown */}
          {report.dimensions.length > 0 && (
            <DimensionBreakdown dimensions={report.dimensions} />
          )}

          {/* Strengths + Weaknesses — always 2-col for visual balance */}
          {(report.strengths.length > 0 || report.weaknesses.length > 0) && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <StrengthsPanel  items={report.strengths}  />
              <WeaknessesPanel items={report.weaknesses} />
            </div>
          )}

          {/* Improvement tips */}
          {report.improvement_tips.length > 0 && (
            <ImprovementTipsAccordion tips={report.improvement_tips} />
          )}

          {/* Band-targeted sample response */}
          {report.sample_response && (
            <SampleResponseCard
              sampleResponse={report.sample_response}
              targetBand={targetBand}
            />
          )}

        </div>

        {/* Question + User response — ORDER 2 on mobile, ORDER 1 (left) on desktop */}
        <div className="lg:w-[60%] lg:sticky lg:top-[3.5rem] lg:max-h-[calc(100vh-4rem)] flex flex-col order-2 lg:order-1">
          {/* Mobile-only label so users know this section is their question+response */}
          <p className="lg:hidden text-[10px] font-bold uppercase tracking-[0.18em] text-white/25 mb-2">
            Question &amp; Your Response
          </p>
          <ResponsePanel
            skill={report.skill}
            taskNumber={report.task_number}
            promptText={report.prompt_text}
            instructionsText={report.instructions_text}
            contextImageUrl={report.context_image_url}
            choiceOptions={report.choice_options}
            curveballOption={report.curveball_option}
            curveballInstructionText={report.curveball_instruction_text}
            userResponseText={report.user_response_text}
          />
        </div>

      </div>

      {/* ── Footer CTA ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Keep practising to improve your score</p>
          <p className="text-xs text-subtle mt-0.5">Consistent practice is the fastest path to Band 10+</p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link
            href="/history"
            className="rounded-xl border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
          >
            My History
          </Link>
          <Link
            href={`/${report.skill}/${report.prompt_id}/practice`}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Practice Again →
          </Link>
        </div>
      </div>

    </div>
  );
}
