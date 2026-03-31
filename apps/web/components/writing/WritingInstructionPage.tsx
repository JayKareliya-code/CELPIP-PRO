// ─────────────────────────────────────────────────────────────────────────────
// WritingInstructionPage.tsx — Full instruction layout for a writing task
//
// Layout (mirrors TaskInstructionPage from the speaking module):
//   Breadcrumb
//   Heading row
//   3-col grid:
//     Left (2 cols): WritingPromptBox + WritingMetaBadges
//     Right (1 col): IdeaHintsPanel + IntroTemplateCard + ConclusionTemplateCard
//   StartWritingButton (full width)
// ─────────────────────────────────────────────────────────────────────────────

import { BreadcrumbNav }        from "@/components/layout/BreadcrumbNav";
import { WritingPromptBox }     from "@/components/writing/WritingPromptBox";
import { WritingMetaBadges }    from "@/components/writing/WritingMetaBadges";
import { IdeaHintsPanel }       from "@/components/writing/IdeaHintsPanel";
import { IntroTemplateCard }    from "@/components/writing/IntroTemplateCard";
import { ConclusionTemplateCard } from "@/components/writing/ConclusionTemplateCard";
import { StartWritingButton }   from "@/components/writing/StartWritingButton";
import type { WritingTask }     from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingInstructionPageProps {
  task: WritingTask;
}

/**
 * Full instruction layout for a single writing task.
 * This is a server component — all children that need interactivity
 * (IntroTemplateCard, ConclusionTemplateCard) are individually "use client".
 */
export function WritingInstructionPage({ task }: WritingInstructionPageProps) {
  return (
    <div>
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* Page heading */}
      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
        <p className="text-sm text-subtle mt-1">
          Task {task.task_number} — Writing Module
        </p>
      </div>

      {/* 3-column instruction grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left / main content ────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <WritingPromptBox promptText={task.prompt_text} />
          <WritingMetaBadges
            timeLimitSeconds={task.time_limit_seconds}
            minWords={task.min_words}
            maxWords={task.max_words}
          />
        </div>

        {/* ── Right / tips sidebar ───────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {task.idea_hints && task.idea_hints.length > 0 && (
            <IdeaHintsPanel hints={task.idea_hints} />
          )}
          {task.intro_template && (
            <IntroTemplateCard template={task.intro_template} />
          )}
          {task.conclusion_template && (
            <ConclusionTemplateCard template={task.conclusion_template} />
          )}
        </div>

      </div>

      {/* Start Writing CTA */}
      <div className="mt-8">
        <StartWritingButton taskId={task.id} />
      </div>
    </div>
  );
}
