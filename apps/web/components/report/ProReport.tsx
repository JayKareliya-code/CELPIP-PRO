"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ProReport.tsx — Tab-based full-width report for Pro / Ultra users
//
// Phase 1 redesign: replaces the 60/40 split-screen with 3 focused tabs:
//
//   📊 Coaching Report (default)
//      Score summary → Dimension breakdown → Strengths/Weaknesses →
//      Coaching drills → Sample response
//
//   📝 My Response
//      Original prompt + full transcript/essay — clean reading view
//
//   📈 Analytics
//      Score trend (ScoreProgressCard) + Speech analytics (speaking only)
//
// The tab nav is sticky so users can switch context without scrolling back up.
// All tab content is conditionally rendered (not hidden) so network requests
// in child components fire only when the user actually opens that tab.
// ─────────────────────────────────────────────────────────────────────────────

import { useState }                        from "react";
import Link                                from "next/link";
import { formatBand }                      from "@/lib/utils";

import { ReportTabNav }                    from "./ReportTabNav";
import type { ReportTab }                  from "./ReportTabNav";
import { ResponsePanel }                   from "./ResponsePanel";
import { ScoreSummaryCard }                from "./ScoreSummaryCard";
import { ScoreProgressCard }               from "./ScoreProgressCard";
import { DimensionBreakdown }              from "./DimensionBreakdown";
import { FeedbackToggle }                              from "./FeedbackPanels";
import { ImprovementTipsAccordion }        from "./ImprovementTipsAccordion";
import { TranscriptAnalysisCard }          from "./TranscriptAnalysisCard";
import { EssayAnalysisCard }              from "./EssayAnalysisCard";
import { SampleResponseCard }              from "./SampleResponseCard";

import type { ReportResponse }             from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

// Official CELPIP speaking response window per task number (seconds)
const TASK_DURATION_S: Record<number, number> = {
  0: 60, 1: 90, 2: 60, 3: 60, 4: 60, 5: 60, 6: 60, 7: 60, 8: 60,
};

type TabId = "coaching" | "response" | "analytics";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  report:     ReportResponse;
  targetBand: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProReport({ report, targetBand }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("coaching");

  const isSpeak       = report.skill === "speaking";
  const wordCount     = isSpeak ? countWords(report.user_response_text) : undefined;
  const taskDurationS = TASK_DURATION_S[report.task_number] ?? 60;
  const hasTranscript = isSpeak && !!report.transcript;
  const hasEssay      = !isSpeak && !!report.user_response_text;

  // Weakest dimension — drives personalized footer CTA
  const weakestDim = report.dimensions.length > 0
    ? report.dimensions.reduce((min, d) => d.score < min.score ? d : min)
    : null;

  // Build tab list — Analytics tab only exists for speaking attempts
  const tabs: ReportTab[] = [
    { id: "coaching",  label: "Coaching Report" },
    { id: "response",  label: "My Response"     },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="flex flex-col gap-0">

      {/* ── Sticky tab bar ──────────────────────────────────────────────────────
          Sticks just below the main navbar (navbar height = 3.5rem / 56px).
          backdrop-blur gives a frosted-glass feel as content scrolls under it.
      */}
      <div className="sticky top-[3.5rem] z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-3 pb-3 backdrop-blur-md bg-background/80 border-b border-border/40">
        <ReportTabNav
          tabs={tabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="pt-5">

        {/* ── COACHING REPORT ─────────────────────────────────────────────── */}
        {activeTab === "coaching" && (
          <div
            id="report-panel-coaching"
            role="tabpanel"
            aria-labelledby="tab-coaching"
            className="flex flex-col gap-4 animate-fade-in"
          >
            {/* 1 — Score summary */}
            <ScoreSummaryCard
              estimatedBand={report.estimated_band}
              skill={report.skill}
              completedAt={report.completed_at}
              nextMilestone={report.next_milestone || undefined}
              wordCount={wordCount}
            />

            {/* 2 — Rubric dimension bars */}
            {report.dimensions.length > 0 && (
              <DimensionBreakdown dimensions={report.dimensions} />
            )}

            {/* 3 — Strengths / Weaknesses toggle (Phase 2) */}
            {(report.strengths.length > 0 || report.weaknesses.length > 0) && (
              <FeedbackToggle
                strengths={report.strengths}
                weaknesses={report.weaknesses}
              />
            )}

            {/* 4 — Coaching drills */}
            {report.improvement_tips.length > 0 && (
              <ImprovementTipsAccordion tips={report.improvement_tips} />
            )}

            {/* 5 — Band-targeted sample response */}
            {report.sample_response && (
              <SampleResponseCard
                sampleResponse={report.sample_response}
                targetBand={targetBand}
                taskNumber={report.task_number}
              />
            )}

            {/* 6 — Footer CTA (Phase 3: personalized) */}
            <ReportFooterCta report={report} weakestDim={weakestDim} />
          </div>
        )}

        {/* ── MY RESPONSE ─────────────────────────────────────────────────── */}
        {activeTab === "response" && (
          <div
            id="report-panel-response"
            role="tabpanel"
            aria-labelledby="tab-response"
            className="animate-fade-in"
          >
            {/*
              ResponsePanel was designed for the sticky split-screen context
              (h-full, lg:flex-1, lg:overflow-y-auto).  In the tab layout it
              renders as a natural full-width flow — no overflow clipping needed.
              The existing styles fall back gracefully since there is no fixed
              parent height constraining it.
            */}
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
        )}

        {/* ── ANALYTICS ────────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div
            id="report-panel-analytics"
            role="tabpanel"
            aria-labelledby="tab-analytics"
            className="flex flex-col gap-4 animate-fade-in"
          >
            {/* Score trend vs previous attempts — deferred network call fires
                only when the user opens this tab (conditional render). */}
            <ScoreProgressCard
              currentBand={report.estimated_band}
              skill={report.skill as "speaking" | "writing"}
              taskNumber={report.task_number}
              currentAttemptId={report.attempt_id}
              currentDimensions={report.dimensions}
            />

            {/* Speaking: transcript analysis */}
            {hasTranscript && (
              <TranscriptAnalysisCard
                transcript={report.transcript!}
                taskDurationS={taskDurationS}
              />
            )}

            {/* Writing: essay analysis */}
            {hasEssay && (
              <EssayAnalysisCard
                essayText={report.user_response_text!}
                taskNumber={report.task_number}
              />
            )}

            {/* Nudge back to coaching if they land here first */}
            <p className="text-center text-xs text-white/25 pb-2">
              Switch to{" "}
              <button
                onClick={() => setActiveTab("coaching")}
                className="underline text-white/40 hover:text-amber-400 transition-colors"
              >
                Coaching Report
              </button>{" "}
              to see your strengths, weaknesses, and drills.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Footer CTA — personalized to weakest dimension (Phase 3) ────────────────

interface FooterProps {
  report:     ReportResponse;
  weakestDim: { label: string; score: number; max_score: number } | null;
}

function ReportFooterCta({ report, weakestDim }: FooterProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4 mt-1">

      {/* Personalized message */}
      {weakestDim ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">
            Focus for your next session
          </p>
          <p className="text-sm leading-relaxed text-white/80">
            Your weakest area was{" "}
            <span className="font-semibold text-white">{weakestDim.label}</span>
            {" "}at{" "}
            <span className="font-bold text-rose-400">
              {formatBand(weakestDim.score)}/{weakestDim.max_score}
            </span>
            . Targeting this dimension in your next practice session is the
            fastest path to a higher overall band.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-foreground">Keep practising to improve your score</p>
          <p className="text-xs text-subtle mt-0.5">Consistent practice is the fastest path to Band 10+</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
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
  );
}
