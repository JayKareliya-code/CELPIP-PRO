import Link from "next/link";
import { BreadcrumbNav }      from "@/components/layout/BreadcrumbNav";
import { TaskPromptBox }      from "@/components/speaking/TaskPromptBox";
import { TaskMetaBadges }     from "@/components/speaking/TaskMetaBadges";
import { StartPracticeButton } from "@/components/speaking/StartPracticeButton";
import { TipsTabPanel }       from "@/components/speaking/TipsTabPanel";
import type { SpeakingTask }  from "@/lib/types";

interface TaskInstructionPageProps {
  task: SpeakingTask;
}

/**
 * Full instruction layout for a single speaking task.
 *
 * Layout:
 *   Breadcrumb
 *   Page heading
 *   Full-width prompt + meta badges
 *   Start Practice button (full width)
 *   TipsTabPanel — browser-tab style: 3 tabs side by side,
 *     active tab merges flush into the content panel below
 */
export function TaskInstructionPage({ task }: TaskInstructionPageProps) {
  const taskLabel =
    task.task_number === 0
      ? "Practice Task"
      : `Task ${task.task_number}`;

  const hasTips =
    (task.vocabulary_tips  && task.vocabulary_tips.length > 0)  ||
    (task.connector_phrases && task.connector_phrases.length > 0) ||
    !!task.template_hint;

  return (
    <div>
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* Page heading */}
      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
        <p className="text-sm text-subtle mt-1">{taskLabel} — Speaking Module</p>
      </div>

      {/* Prompt + meta badges — full width */}
      <div className="flex flex-col gap-4">
        <TaskPromptBox promptText={task.prompt_text} />
        <TaskMetaBadges
          prepTimeSecs={task.prep_time_seconds}
          responseTimeSecs={task.response_time_seconds}
          hasParts={task.has_parts}
        />
      </div>

      {/* Start Practice CTA */}
      <div className="mt-6">
        <StartPracticeButton taskId={task.id} />
      </div>

      {/* Tips — browser-tab panel below the button */}
      {hasTips && (
        <div className="mt-4">
          {/* Link to full standalone tips page */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-subtle font-medium uppercase tracking-wide">
              Study tips
            </p>
            <Link
              href={`/speaking/${task.id}/tips`}
              className="text-xs text-primary hover:underline font-medium"
            >
              Open full tips page →
            </Link>
          </div>
          <TipsTabPanel
            vocabularyTips={task.vocabulary_tips   ?? []}
            connectorPhrases={task.connector_phrases ?? []}
            templateHint={task.template_hint        ?? ""}
          />
        </div>
      )}
    </div>
  );
}
