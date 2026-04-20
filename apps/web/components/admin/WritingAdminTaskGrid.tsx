"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingAdminTaskGrid.tsx — 2-task card grid for /admin/prompts (writing tab).
// Mirrors SpeakingTaskGrid.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo }   from "react";
import { useRouter } from "next/navigation";
import { Loader2 }   from "lucide-react";
import { WritingAdminTaskCard }                   from "./writing/WritingAdminTaskCard";
import { WRITING_TASK_META, countWritingByStatus } from "@/lib/admin/writingTaskMeta";
import { useAdminWritingPrompts }                  from "@/lib/hooks/useAdminPrompts";

export function WritingAdminTaskGrid() {
  const router = useRouter();
  const { data: prompts = [], isLoading, isError } = useAdminWritingPrompts();

  const counts = useMemo(
    () => WRITING_TASK_META.map((meta) => countWritingByStatus(prompts, meta.taskNumber)),
    [prompts],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-subtle text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading writing tasks…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-danger text-sm">
        Failed to load writing prompts. Check your connection and refresh.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {WRITING_TASK_META.map((meta, i) => (
          <WritingAdminTaskCard
            key={meta.taskNumber}
            meta={meta}
            counts={counts[i]}
            onClick={() => router.push(`/admin/prompts/writing/${meta.taskNumber}`)}
          />
        ))}
      </div>
    </div>
  );
}
