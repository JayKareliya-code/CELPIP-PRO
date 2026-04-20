// ─────────────────────────────────────────────────────────────────────────────
// WritingPromptCard.tsx — Single prompt card in the writing task folder.
//
// Renders: task type badge · attempted/retry badge · time + word-count row ·
//          prompt excerpt · CTA button.
// Links to /writing/[taskId]/instruction.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { Clock, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { WritingPromptCtaButton } from "@/components/writing/WritingPromptCtaButton";
import type { WritingTask } from "@/lib/types";

// ── Shared ────────────────────────────────────────────────────────────────────

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none select-none";

function formatTime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingPromptCardProps {
  task: WritingTask;
  isAlreadyAttempted: boolean;
  isBonusRetry: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WritingPromptCard({
  task,
  isAlreadyAttempted,
  isBonusRetry,
}: WritingPromptCardProps) {
  return (
    <Link href={`/writing/${task.id}/practice`} className="group block">
      <div className="rounded-xl border border-white/[0.08] bg-surface hover:border-white/[0.18] hover:shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all duration-200 overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-2 flex-wrap">

            {/* Left: type + status badges */}
            <div className="flex items-center gap-2">
              <span className={cn(BADGE_BASE, "bg-primary/10 text-primary border-primary/20")}>
                {task.task_type}
              </span>
              {isAlreadyAttempted && (
                <span className={cn(BADGE_BASE, "bg-emerald-900/30 text-emerald-400 border-emerald-700/40")}>
                  Attempted
                </span>
              )}
              {isBonusRetry && (
                <span className={cn(BADGE_BASE, "bg-amber-900/30 text-amber-400 border-amber-700/40")}>
                  Retry mode
                </span>
              )}
            </div>

            {/* Right: time + word count */}
            <div className="flex items-center gap-3 text-xs text-subtle/70">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(task.time_limit_seconds)}
              </span>
              <span className="w-px h-3 bg-white/10 self-center" />
              <span className="flex items-center gap-1">
                <AlignLeft className="w-3 h-3" />
                {task.max_words != null
                  ? `${task.min_words}–${task.max_words} words`
                  : `${task.min_words}+ words`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Prompt excerpt ───────────────────────────────────────────────── */}
        <div className="px-4 py-3">
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">
            {task.prompt_text}
          </p>
        </div>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-1">
          <WritingPromptCtaButton
            isAlreadyAttempted={isAlreadyAttempted}
            isBonusRetry={isBonusRetry}
          />
        </div>
      </div>
    </Link>
  );
}
