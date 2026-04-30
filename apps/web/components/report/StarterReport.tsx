"use client";

// ─────────────────────────────────────────────────────────────────────────────
// StarterReport.tsx — Split-screen report layout for Starter plan users
//
// LEFT  — Question prompt + user's response (always available — user's own data)
// RIGHT — Score card + locked rubric preview + upgrade CTA
// ─────────────────────────────────────────────────────────────────────────────

import { ResponsePanel }          from "./ResponsePanel";
import { ScoreSummaryCard }       from "./ScoreSummaryCard";
import { LockedDimensionPreview } from "./LockedDimensionPreview";
import { LockedSection }          from "./LockedSection";
import { ReportUpgradeCTA }       from "./ReportUpgradeCTA";
import type { ReportResponse }    from "@/lib/types";

interface Props {
  report: ReportResponse;
}

export function StarterReport({ report }: Props) {
  return (
    <div className="flex flex-col gap-5">

      {/* Mobile: score first, question/response second. Desktop: split-screen. */}
      <div className="flex flex-col lg:flex-row gap-5 lg:items-start">

        {/* Score + Locked rubric — ORDER 1 on mobile, right column on desktop */}
        <div className="flex-1 flex flex-col gap-4 order-1 lg:order-2">

          {/* Score summary */}
          <ScoreSummaryCard
            estimatedBand={report.estimated_band}
            skill={report.skill}
            completedAt={report.completed_at}
          />

          {/* Dimension preview (names visible, scores locked) */}
          <LockedDimensionPreview skill={report.skill} />

          {/* Strengths & Areas to Improve (locked) */}
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

          {/* Improvement tips (locked) */}
          <LockedSection
            title="Improvement Tips"
            description="Pro gives you a numbered action plan to raise your band on the next attempt."
          />

          {/* Sample response (locked) */}
          <LockedSection
            title="Band-Targeted Sample Response"
            description="Pro shows a sample response written to your target band — not a generic Band 12 example."
          />

          {/* Upgrade CTA */}
          <ReportUpgradeCTA />

        </div>

        {/* Question + User response — ORDER 2 on mobile, left column on desktop */}
        <div className="lg:w-[60%] lg:sticky lg:top-[3.5rem] lg:max-h-[calc(100vh-4rem)] flex flex-col order-2 lg:order-1">
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

    </div>
  );
}
