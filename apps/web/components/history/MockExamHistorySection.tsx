"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MockExamHistorySection.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  ChevronDown, ChevronUp,
  ClipboardList,
  CheckCircle2, XCircle, Clock,
  Loader2,
} from "lucide-react";
import { ScoreBadge }         from "@/components/common/ScoreBadge";
import { EmptyState }         from "@/components/common/EmptyState";
import { PaginationFooter }   from "@/components/common/PaginationFooter";
import { timeAgo }            from "@/lib/utils";
import { useMockExamHistory } from "@/lib/hooks/useMockExamHistory";
import type { MockExamSession, MockExamTaskResult } from "@/lib/hooks/useMockExamHistory";

// ── Task labels per skill ─────────────────────────────────────────────────────

const SPEAKING_TASK_NAMES: Record<number, string> = {
  1: "Advice",
  2: "Talking to a Person",
  3: "Describing a Scene",
  4: "Making Predictions",
  5: "Comparing & Persuading",
  6: "Dealing with a Difficult Situation",
  7: "Expressing Opinions",
  8: "Describing an Unusual Situation",
};

const WRITING_TASK_NAMES: Record<number, string> = {
  1: "Email Writing",
  2: "Opinion Essay",
};

function getTaskName(skill: MockExamSession["skill"], taskNumber: number): string {
  if (skill === "writing") return WRITING_TASK_NAMES[taskNumber] ?? `Task ${taskNumber}`;
  return SPEAKING_TASK_NAMES[taskNumber] ?? `Task ${taskNumber}`;
}

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: MockExamTaskResult["status"] }) {
  if (status === "complete")   return <CheckCircle2 className="w-4 h-4 text-success"  />;
  if (status === "failed")     return <XCircle      className="w-4 h-4 text-danger"   />;
  if (status === "processing") return <Loader2      className="w-4 h-4 text-warning animate-spin" />;
  return                              <Clock        className="w-4 h-4 text-subtle"   />;
}

// ── Per-task row ──────────────────────────────────────────────────────────────

function TaskRow({ task, skill }: { task: MockExamTaskResult; skill: MockExamSession["skill"] }) {
  return (
    <div className="grid grid-cols-[2rem_1fr_2rem_3.5rem] items-center gap-3
                    py-2.5 px-4 rounded-lg hover:bg-white/5 transition-colors">
      {/* Task number */}
      <span className="text-xs font-mono text-subtle text-right">
        {task.task_number}
      </span>

      {/* Task name */}
      <span className="text-sm text-foreground">
        {getTaskName(skill, task.task_number)}
      </span>

      {/* Status icon — centred in its column */}
      <span className="flex justify-center">
        <StatusIcon status={task.status} />
      </span>

      {/* Band score — plain coloured text matching the recent attempts table */}
      <span className="flex justify-center">
        {task.estimated_band !== null ? (
          <ScoreBadge band={task.estimated_band} plain />
        ) : (
          <span className="text-xs text-subtle">—</span>
        )}
      </span>
    </div>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: MockExamSession }) {
  const [expanded, setExpanded] = useState(false);
  const pct = session.tasks_total > 0
    ? (session.tasks_complete / session.tasks_total) * 100
    : 0;

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4
                   hover:bg-white/5 transition-colors text-left"
        aria-expanded={expanded}
      >
        {/* Left: icon + title + date + progress */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              {session.skill === "writing" ? "Writing Mock Exam" : "Speaking Mock Exam"}
            </span>
            <span className="text-xs text-subtle">{timeAgo(session.created_at)}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative h-1.5 w-36 rounded-full bg-border overflow-hidden shrink-0">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-subtle tabular-nums">
              {session.tasks_complete}/{session.tasks_total} tasks scored
            </span>
          </div>
        </div>

        {/* Right: avg band + chevron */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center min-w-[3rem]">
            {session.avg_band !== null ? (
              <>
                <ScoreBadge band={session.avg_band} plain />
                <p className="text-[10px] text-subtle mt-0.5 leading-none">avg band</p>
              </>
            ) : (
              <span className="text-xs text-subtle">—</span>
            )}
          </div>
          {expanded
            ? <ChevronUp   className="w-4 h-4 text-subtle" />
            : <ChevronDown className="w-4 h-4 text-subtle" />
          }
        </div>
      </button>

      {/* ── Expanded breakdown ─────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-2 py-2">
          {/* Column header */}
          <div className="grid grid-cols-[2rem_1fr_2rem_3.5rem] items-center gap-3
                          px-4 pb-1.5 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle text-right">#</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Task</span>
            <span />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle text-center">Band</span>
          </div>

          <div className="divide-y divide-border/20">
            {session.tasks
              .slice()
              .sort((a, b) => a.task_number - b.task_number)
              .map((task) => <TaskRow key={task.task_number} task={task} skill={session.skill} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-36 rounded bg-border/60" />
        <div className="h-7 w-14 rounded-full bg-border/60" />
      </div>
      <div className="h-1.5 w-full rounded-full bg-border/40" />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function MockExamHistorySection() {
  const [page, setPage] = useState(1);
  const { sessions, isLoading, isError } = useMockExamHistory(page);

  if (isLoading && !sessions) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center space-y-2">
        <p className="text-base font-semibold text-foreground">Failed to load mock exam history</p>
        <p className="text-sm text-subtle">Please refresh the page to try again.</p>
      </div>
    );
  }

  if (!sessions || sessions.items.length === 0) {
    return (
      <EmptyState
        title="No mock exams yet"
        description="Complete a full mock exam to see your session results here."
      />
    );
  }

  const { items, total, limit, has_next } = sessions;
  const start      = (page - 1) * limit + 1;
  const end        = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className={`space-y-3 transition-opacity duration-200 ${isLoading ? "opacity-60 pointer-events-none" : ""}`}>
        {items.map((session) => (
          <SessionCard key={session.session_id} session={session} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationFooter
          page={page}
          totalPages={totalPages}
          total={total}
          start={start}
          end={end}
          has_next={has_next}
          isLoading={isLoading}
          itemLabel="session"
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
