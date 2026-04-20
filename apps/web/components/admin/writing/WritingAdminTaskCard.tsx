"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/writing/WritingTaskCard.tsx
// Task card for the WritingTaskGrid — mirrors speaking/TaskCard.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskStatusPills } from "@/components/admin/speaking/TaskStatusPills";
import type { WritingTaskMeta, WritingTaskCounts } from "@/lib/admin/writingTaskMeta";

interface Props {
  meta:    WritingTaskMeta;
  counts:  WritingTaskCounts;
  onClick: () => void;
}

export function WritingAdminTaskCard({ meta, counts, onClick }: Props) {
  return (
    <button
      id={`admin-writing-task-${meta.taskNumber}`}
      onClick={onClick}
      className={cn(
        "group relative w-full text-left rounded-2xl border border-border bg-surface",
        "p-5 flex flex-col gap-4 shadow-card transition-all duration-200",
        "hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
      )}
    >
      {/* Hover gradient */}
      <div className={cn(
        "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
        meta.bgGradient,
      )} />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <span className={cn("text-xs font-bold tracking-widest uppercase", meta.color)}>
            {meta.label}
          </span>
          <p className="mt-1 text-sm font-semibold text-foreground leading-snug">
            {meta.name}
          </p>
          <span className="mt-1 inline-block text-[10px] text-subtle/70">{meta.taskType}</span>
        </div>
        <ChevronRight className={cn(
          "w-4 h-4 mt-1 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5",
          meta.color,
        )} />
      </div>

      {/* Count + status pills */}
      <div className="relative">
        <p className="text-3xl font-bold text-foreground tabular-nums">
          {counts.total}
          <span className="ml-1.5 text-sm font-normal text-subtle">
            {counts.total === 1 ? "prompt" : "prompts"}
          </span>
        </p>
        <div className="mt-3">
          <TaskStatusPills counts={counts} />
        </div>
      </div>
    </button>
  );
}
