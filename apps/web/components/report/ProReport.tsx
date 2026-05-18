"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ProReport.tsx — Tab-based full-width report for Pro / Ultra users
//
// Phase 1 redesign: replaces the 60/40 split-screen with 3 focused tabs:
//
// Both Starter and Pro render through this component.
//   isPro=true  → full coaching report: all data visible, no overlays.
//   isPro=false → advanced sections replaced with LockedSection placeholders.
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
import { ArrowRight, GraduationCap, FileText, BarChart3, Lock } from "lucide-react";
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
import { LockedDimensionPreview }          from "./LockedDimensionPreview";
import { LockedSection }                   from "./LockedSection";

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
  /** When false (Starter plan) advanced sections are locked with upgrade prompts. */
  isPro:      boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProReport({ report, targetBand, isPro }: Props) {
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

  // Build tab list — Analytics tab always shows; locked for Starter.
  const tabs: ReportTab[] = [
    { id: "coaching",  label: "Coaching Report", icon: GraduationCap },
    { id: "response",  label: "My Response",     icon: FileText      },
    { id: "analytics", label: "Analytics",       icon: BarChart3     },
  ];

  // Starter: swap the Analytics icon to a Lock so the tab reads as gated.
  const displayTabs: ReportTab[] = isPro
    ? tabs
    : tabs.map((t) => t.id === "analytics" ? { ...t, icon: Lock } : t);

  return (
    <div className="flex flex-col gap-0">

      {/* ── Sticky tab bar ──────────────────────────────────────────────────────
          Sticks just below the main navbar (navbar height = 3.5rem / 56px).
          backdrop-blur gives a frosted-glass feel as content scrolls under it.
          The tab nav supplies its own rail border, so this container only
          handles the sticky positioning + blurred backdrop.
      */}
      <div className="sticky top-[3.5rem] z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-2 backdrop-blur-md bg-background/80">
        <ReportTabNav
          tabs={displayTabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="pt-5">

        {activeTab === "coaching" && (
          <div
            id="report-panel-coaching"
            role="tabpanel"
            aria-labelledby="tab-coaching"
            className="flex flex-col gap-4 animate-fade-in"
          >
            {/* 1 — Score summary + Starter upsell side-by-side */}
            {isPro ? (
              <ScoreSummaryCard
                estimatedBand={report.estimated_band}
                skill={report.skill}
                completedAt={report.completed_at}
                nextMilestone={report.next_milestone || undefined}
                wordCount={wordCount}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ScoreSummaryCard
                  estimatedBand={report.estimated_band}
                  skill={report.skill}
                  completedAt={report.completed_at}
                  nextMilestone={undefined}
                  wordCount={undefined}
                />
                <StarterUpgradeSideCard />
              </div>
            )}

            {/* 2 — Rubric dimension bars */}
            {isPro ? (
              report.dimensions.length > 0 && (
                <DimensionBreakdown dimensions={report.dimensions} />
              )
            ) : (
              <LockedDimensionPreview skill={report.skill} />
            )}

            {/* 3 — Strengths / Weaknesses */}
            {isPro ? (
              (report.strengths.length > 0 || report.weaknesses.length > 0) && (
                <FeedbackToggle
                  strengths={report.strengths}
                  weaknesses={report.weaknesses}
                />
              )
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <LockedSection
                  title="Strengths"
                  description="Pro shows what you did well, with specific examples from your response."
                />
                <LockedSection
                  title="Areas to Improve"
                  description="Pro highlights your exact gaps with actionable, task-specific guidance."
                />
              </div>
            )}

            {/* 4 — Coaching drills */}
            {isPro ? (
              report.improvement_tips.length > 0 && (
                <ImprovementTipsAccordion tips={report.improvement_tips} />
              )
            ) : (
              <LockedSection
                title="Improvement Tips"
                description="Pro gives you a numbered action plan to raise your band on the next attempt."
              />
            )}

            {/* 5 — Band-targeted sample response */}
            {isPro ? (
              report.sample_response && (
                <SampleResponseCard
                  sampleResponse={report.sample_response}
                  targetBand={targetBand}
                  taskNumber={report.task_number}
                />
              )
            ) : (
              <LockedSection
                title="Band-Targeted Sample Response"
                description="Pro shows a sample response written to your target band — not a generic Band 12 example."
              />
            )}

            {/* 6 — Footer CTA (Pro only — Starter upsell is beside the score gauge now) */}
            {isPro && (
              <ReportFooterCta report={report} weakestDim={weakestDim} />
            )}
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
            {isPro ? (
              <>
                {/* Score trend vs previous attempts */}
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

                {/* Nudge back to coaching */}
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
              </>
            ) : (
              /* Starter: locked analytics placeholder */
              <div className="flex flex-col gap-4">
                <LockedSection
                  title="Score Progress Chart"
                  description="Pro tracks your band score across every attempt so you can see your improvement over time."
                />
                <LockedSection
                  title={report.skill === "speaking" ? "Transcript Analysis" : "Essay Analysis"}
                  description={
                    report.skill === "speaking"
                      ? "Pro analyses your speaking speed, filler words, and fluency patterns."
                      : "Pro breaks down your essay structure, vocabulary range, and sentence variety."
                  }
                />
                <StarterUpgradeCta />
              </div>
            )}
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
        {/* Guard: task_number should always be present, but legacy DB rows
            may have a null. Fall back to omitting the task segment so the
            URL degrades gracefully rather than producing /skill/undefined/... */}
        {report.task_number != null ? (
          <Link
            href={`/${report.skill}/${report.task_number}/${report.prompt_id}/practice`}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Practice Again →
          </Link>
        ) : (
          <Link
            href={`/${report.skill}`}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Practice Again →
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Starter Upgrade CTA — compact side card beside score gauge ───────────────

const PRO_FEATURES = [
  "Per-dimension rubric scores (Task Completion, Coherence, Vocabulary…)",
  "Detailed strengths & specific areas to improve",
  "Numbered improvement tips tailored to your response",
  "Band-targeted sample response matched to your goal",
  "Score progress chart and full analytics",
];

function StarterUpgradeSideCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-700/30 bg-gradient-to-br from-amber-950/50 via-amber-950/25 to-transparent p-5 flex flex-col gap-4">
      {/* Ambient glow */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-1">
          Unlock Full Report
        </p>
        <h3 className="text-base font-bold text-foreground leading-snug">
          You&rsquo;re on the Starter plan
        </h3>
        <p className="mt-1 text-xs text-subtle leading-relaxed">
          Upgrade to Pro to unlock the complete coaching report.
        </p>
      </div>

      {/* Feature list */}
      <ul className="space-y-1.5 flex-1">
        {PRO_FEATURES.map((feat) => (
          <li key={feat} className="flex items-start gap-2 text-xs text-foreground/70">
            <span className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="block h-1 w-1 rounded-full bg-amber-400" />
            </span>
            {feat}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="pt-3 border-t border-amber-700/20">
        <div className="mb-2">
          <p className="text-xs font-bold text-foreground">Pro Plan — $9.99 CAD</p>
          <p className="text-[10px] text-subtle">One-time payment · Never expires</p>
        </div>
        <Link
          href="/billing"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-2.5 text-sm font-bold text-black transition-colors duration-200"
        >
          Upgrade to Pro <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ── Legacy bottom CTA (kept for Analytics tab Starter gate) ──────────────────

function StarterUpgradeCta() {
  return (
    <div className="rounded-2xl border border-amber-700/30 bg-gradient-to-br from-amber-950/40 via-amber-950/20 to-transparent p-6 flex flex-col gap-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-1">
          Unlock Full Report
        </p>
        <h3 className="text-lg font-bold text-foreground">
          You&rsquo;re seeing the Starter summary
        </h3>
        <p className="mt-1 text-sm text-subtle leading-relaxed">
          Upgrade to Pro for the complete coaching report — rubric breakdown,
          feedback panels, improvement plan, and a sample response tuned to your target band.
        </p>
      </div>

      <ul className="space-y-2">
        {PRO_FEATURES.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5 text-sm text-foreground/75">
            <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="block h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            {feat}
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-amber-700/20">
        <div>
          <p className="text-sm font-bold text-foreground">Pro Plan — $9.99 CAD</p>
          <p className="text-xs text-subtle">One-time payment · Never expires</p>
        </div>
        <Link
          href="/billing"
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-2.5 text-sm font-semibold text-black transition-colors"
        >
          Upgrade to Pro <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
