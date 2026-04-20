"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/writing/WritingTaskHeader.tsx
// Back breadcrumb + page title + "Add Prompt" button.
// Mirrors speaking/SpeakingTaskHeader.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { ArrowLeft, Plus } from "lucide-react";
import { useRouter }       from "next/navigation";
import { WRITING_TASK_META } from "@/lib/admin/writingTaskMeta";

interface Props {
  taskNumber:  1 | 2;
  promptCount: number;
  isMutating:  boolean;
  onAdd:       () => void;
}

export function WritingTaskHeader({ taskNumber, promptCount, isMutating, onAdd }: Props) {
  const router = useRouter();
  const meta   = WRITING_TASK_META.find((m) => m.taskNumber === taskNumber);
  const name   = meta?.name ?? `Task ${taskNumber}`;

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/prompts")}
          className="flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Tasks
        </button>
        <span className="text-border select-none">/</span>
        <span className="text-sm font-semibold text-foreground">Writing Task {taskNumber}</span>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Task {taskNumber}
            <span className="ml-2 text-base font-normal text-subtle">— {name}</span>
          </h1>
          <p className="text-sm text-subtle mt-0.5">
            {promptCount} prompt{promptCount !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          id={`add-writing-prompt-task-${taskNumber}`}
          onClick={onAdd}
          disabled={isMutating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover
                     text-white text-sm font-semibold transition-colors shadow-sm
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Prompt
        </button>
      </div>
    </>
  );
}
