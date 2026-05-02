"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/speaking/SpeakingTaskHeader.tsx
// Back-nav breadcrumb + page title + "Add Prompt" action button.
// ─────────────────────────────────────────────────────────────────────────────

import { ArrowLeft, Plus, ImageIcon } from "lucide-react";
import { useRouter }                  from "next/navigation";
import { SPEAKING_TASK_NAMES, IMAGE_TASK_NUMBERS } from "@/lib/constants";

interface Props {
  taskNumber:  number;
  isMutating:  boolean;
  onAdd:       () => void;
}

export function SpeakingTaskHeader({ taskNumber, isMutating, onAdd }: Props) {
  const router      = useRouter();
  const taskName    = SPEAKING_TASK_NAMES[`task-${taskNumber}`] ?? `Task ${taskNumber}`;
  const [, shortName] = taskName.split("—").map((s) => s.trim());
  const isImageTask = IMAGE_TASK_NUMBERS.has(taskNumber);

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
        <span className="text-sm font-semibold text-foreground">Task {taskNumber}</span>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-foreground">
              Task {taskNumber}
              {shortName && (
                <span className="ml-2 text-base font-normal text-subtle">— {shortName}</span>
              )}
            </h1>
            {isImageTask && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                               text-[11px] font-semibold border
                               bg-teal-900/30 text-teal-400 border-teal-700/40">
                <ImageIcon className="w-3 h-3" />
                Image task
              </span>
            )}
          </div>
          <p className="text-sm text-subtle mt-0.5">
            {isImageTask && (
              <span className="text-subtle/60">
                Each prompt requires a scene image URL
              </span>
            )}
          </p>
        </div>

        <button
          id={`add-prompt-task-${taskNumber}`}
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
