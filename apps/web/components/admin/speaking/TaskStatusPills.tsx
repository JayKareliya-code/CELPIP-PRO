"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/speaking/TaskStatusPills.tsx
// Status pills + progress bar rendered inside each task card.
// ─────────────────────────────────────────────────────────────────────────────

import { CheckCircle2, Clock, Archive } from "lucide-react";
import type { TaskCounts } from "@/lib/admin/speakingTaskMeta";

interface Props { counts: TaskCounts }

export function TaskStatusPills({ counts }: Props) {
  const { total, published, draft, archived } = counts;

  if (total === 0) {
    return <p className="text-xs text-subtle italic">No prompts yet — add your first one</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center flex-wrap gap-2">
        {published > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/10 text-success border border-success/20">
            <CheckCircle2 className="w-3 h-3" />
            {published} published
          </span>
        )}
        {draft > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning/10 text-warning border border-warning/20">
            <Clock className="w-3 h-3" />
            {draft} draft
          </span>
        )}
        {archived > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-subtle border border-border">
            <Archive className="w-3 h-3" />
            {archived} archived
          </span>
        )}
      </div>

      {/* Segmented progress bar */}
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden flex">
        <div className="h-full bg-success transition-all" style={{ width: `${(published / total) * 100}%` }} />
        <div className="h-full bg-warning transition-all" style={{ width: `${(draft    / total) * 100}%` }} />
      </div>
    </div>
  );
}
