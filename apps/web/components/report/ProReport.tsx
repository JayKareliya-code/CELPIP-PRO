"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ProReport.tsx — Split-screen report layout for Pro / Ultra plan users
//
// LEFT  — Question prompt + user's response (essay or transcript)
// RIGHT — Score gauge, score progress, dimension breakdown,
//         strengths/weaknesses coaching cards, improvement drill tips,
//         transcript analytics (speaking only), sample response
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ResponsePanel }                  from "./ResponsePanel";
import { ScoreSummaryCard }               from "./ScoreSummaryCard";
import { ScoreProgressCard }              from "./ScoreProgressCard";
import { DimensionBreakdown }             from "./DimensionBreakdown";
import { StrengthsPanel, WeaknessesPanel } from "./FeedbackPanels";
import { ImprovementTipsAccordion }       from "./ImprovementTipsAccordion";
import { TranscriptAnalysisCard }         from "./TranscriptAnalysisCard";
import { SampleResponseCard }             from "./SampleResponseCard";

import type { ReportResponse }            from "@/lib/types";

// ── CELPIP standard response durations per task number ────────────────────────
// Task 0 = practice (open-ended, assume 60s); Tasks 1–8 per official spec.
const TASK_DURATION_S: Record<number, number> = {
  0: 60,
  1: 90,
  2: 60,
  3: 60,
  4: 60,
  5: 60,   // final speaking phase
  6: 60,
  7: 60,
  8: 60,
};

interface Props {
  report:     ReportResponse;
  targetBand: number | null;
}

/** Count words in a string (splits on whitespace). */
function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ProReport({ report, targetBand }: Props) {
  const wordCount = report.skill === "speaking"
    ? countWords(report.user_response_text)
    : undefined;

  const taskDurationS = TASK_DURATION_S[report.task_number] ?? 60;

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
            nextMilestone={report.next_milestone || undefined}
            wordCount={wordCount}
          />

          {/* P2: Score progress vs previous attempt */}
          <ScoreProgressCard
            currentBand={report.estimated_band}
            skill={report.skill as "speaking" | "writing"}
            taskNumber={report.task_number}
            currentAttemptId={report.attempt_id}
          />

          {/* Rubric dimension breakdown */}
          {report.dimensions.length > 0 && (
            <DimensionBreakdown dimensions={report.dimensions} />
          )}

          {/* Strengths + Weaknesses — coaching cards */}
          {(report.strengths.length > 0 || report.weaknesses.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <StrengthsPanel  items={report.strengths}  />
              <WeaknessesPanel items={report.weaknesses} />
            </div>
          )}

          {/* Improvement drill tips */}
          {report.improvement_tips.length > 0 && (
            <ImprovementTipsAccordion tips={report.improvement_tips} />
          )}

          {/* P2: Client-side speech analytics (speaking only, needs transcript) */}
          {report.skill === "speaking" && report.transcript && (
            <TranscriptAnalysisCard
              transcript={report.transcript}
              taskDurationS={taskDurationS}
            />
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
