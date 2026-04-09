"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SpeakingTaskGrid.tsx — 8 task cards grid for /admin/prompts (speaking tab).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo }       from "react";
import { useRouter }     from "next/navigation";
import { Loader2 }       from "lucide-react";
import { TaskCard }      from "./speaking/TaskCard";
import { SPEAKING_TASK_META, countByStatus } from "@/lib/admin/speakingTaskMeta";
import { useAdminSpeakingPrompts }           from "@/lib/hooks/useAdminPrompts";

export function SpeakingTaskGrid() {
  const router = useRouter();
  const { data: prompts = [], isLoading, isError } = useAdminSpeakingPrompts();

  const counts = useMemo(
    () => SPEAKING_TASK_META.map((meta) => countByStatus(prompts, meta.taskNumber)),
    [prompts],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-subtle text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading speaking tasks…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-danger text-sm">
        Failed to load prompts. Check your connection and refresh.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-subtle">Click a task to manage its prompts.</p>
        <span className="text-xs text-subtle tabular-nums">
          {prompts.length} prompt{prompts.length !== 1 ? "s" : ""} total
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SPEAKING_TASK_META.map((meta, i) => (
          <TaskCard
            key={meta.taskNumber}
            meta={meta}
            counts={counts[i]}
            onClick={() => router.push(`/admin/prompts/speaking/${meta.taskNumber}`)}
          />
        ))}
      </div>
    </div>
  );
}
