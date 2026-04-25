"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingTaskPromptsFolder — Folder-style view for ALL prompts of one task.
//
// Mirrors speaking/TaskPromptsFolder exactly:
//   Breadcrumb → Header → Attempt bar → Prompt grid (+ Coming Soon slots)
//
// Props:
//   taskNumber — 1 | 2
//   prompts    — all active WritingTask prompts for this task_number
// ─────────────────────────────────────────────────────────────────────────────

import Link        from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  Clock, ChevronLeft, Sparkles, PenLine, Lock,
  RotateCcw, PlayCircle, AlignLeft, Timer,
} from "lucide-react";
import { BreadcrumbNav }     from "@/components/layout/BreadcrumbNav";
import { useCurrentUser }    from "@/lib/hooks/useCurrentUser";
import { useQuota }          from "@/lib/hooks/useQuota";
import { cn }                from "@/lib/utils";
import { API_V1, api, authHeaders } from "@/lib/api";
import { PRO_PLAN_LIMITS, ULTRA_PLAN_LIMITS } from "@/lib/constants";
import type { WritingTask, Difficulty } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const TASK_LABELS: Record<number, string> = {
  1: "Task 1 — Writing an Email",
  2: "Task 2 — Writing an Opinion Essay",
};

const TASK_DESCRIPTIONS: Record<number, string> = {
  1: "Respond to a written situation by composing a formal or informal email. Fulfill all the required points within the word limit.",
  2: "Write a structured opinion essay presenting and defending your view on a given topic. Use clear reasoning and supporting examples.",
};

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; classes: string }> = {
  easy:   { label: "Easy",   classes: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50" },
  medium: { label: "Medium", classes: "bg-amber-900/40   text-amber-400   border-amber-800/50"  },
  hard:   { label: "Hard",   classes: "bg-red-900/40     text-red-400     border-red-800/50"    },
};

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none select-none";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingTaskPromptsFolderProps {
  taskNumber: 1 | 2;
  prompts:    WritingTask[];
}

// ── CTA Button ────────────────────────────────────────────────────────────────

function CtaButton({ isAttempted, isBonusRetry }: { isAttempted: boolean; isBonusRetry: boolean }) {
  if (isAttempted && !isBonusRetry) {
    return (
      <div className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
        "text-sm font-semibold transition-all duration-150",
        "bg-emerald-700/60 group-hover:bg-emerald-700/80",
        "text-emerald-100 border border-emerald-600/40 group-hover:border-emerald-500/60",
      )}>
        <RotateCcw className="w-4 h-4" />
        Redo
      </div>
    );
  }
  if (isBonusRetry) {
    return (
      <div className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
        "text-sm font-semibold transition-all duration-150",
        "bg-amber-700/60 group-hover:bg-amber-700/80",
        "text-amber-100 border border-amber-600/40 group-hover:border-amber-500/60",
      )}>
        <RotateCcw className="w-4 h-4" />
        Practice Again (Free Retry)
      </div>
    );
  }
  return (
    <div className={cn(
      "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
      "text-sm font-semibold transition-all duration-150",
      "bg-primary/80 group-hover:bg-primary",
      "text-primary-foreground border border-amber-500/40 group-hover:border-amber-400/60",
    )}>
      <PlayCircle className="w-4 h-4" />
      Start Writing
    </div>
  );
}

// ── Coming Soon Card ──────────────────────────────────────────────────────────

function ComingSoonCard({ index }: { index: number }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-surface/50 overflow-hidden opacity-50">
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className={cn(BADGE_BASE, "bg-white/[0.04] text-white/20 border-white/[0.06]")}>
            Prompt {index + 1}
          </span>
          <span className={cn(BADGE_BASE, "bg-white/[0.04] text-white/20 border-white/[0.06]")}>
            Coming soon
          </span>
        </div>
      </div>
      <div className="px-4 py-4 space-y-2">
        <div className="h-3 bg-white/[0.04] rounded w-full" />
        <div className="h-3 bg-white/[0.04] rounded w-5/6" />
        <div className="h-3 bg-white/[0.04] rounded w-2/3" />
      </div>
      <div className="px-4 pb-4 pt-1">
        <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-semibold text-white/20">
          <Sparkles className="w-4 h-4" />
          New Prompt — Coming Soon
        </div>
      </div>
    </div>
  );
}

// ── Prompt Card ───────────────────────────────────────────────────────────────

function PromptCard({
  prompt, index, isAttempted, isBonusRetry,
}: {
  prompt:      WritingTask;
  index:       number;
  isAttempted: boolean;
  isBonusRetry: boolean;
}) {
  const diffCfg = DIFFICULTY_CONFIG[(prompt as WritingTask & { difficulty?: Difficulty }).difficulty ?? "medium"];

  return (
    <Link href={`/writing/${prompt.task_number}/${prompt.id}/practice`} className="group block">
      <div className="rounded-xl border border-white/[0.08] bg-surface hover:border-white/[0.18] hover:shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all duration-200 overflow-hidden">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={cn(BADGE_BASE, "bg-white/[0.06] text-white/40 border-white/[0.08]")}>
                Prompt {index + 1}
              </span>
              {diffCfg && (
                <span className={cn(BADGE_BASE, diffCfg.classes)}>{diffCfg.label}</span>
              )}
              <span className={cn(BADGE_BASE, "bg-primary/10 text-primary border-primary/20")}>
                {prompt.task_type}
              </span>
              {isAttempted && !isBonusRetry && (
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
            {/* Time + word count */}
            <div className="flex items-center gap-2 text-xs text-subtle/70">
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {formatTime(prompt.time_limit_seconds)}
              </span>
              <span className="flex items-center gap-1">
                <AlignLeft className="w-3 h-3" />
                {prompt.max_words != null
                  ? `${prompt.min_words}–${prompt.max_words} words`
                  : `${prompt.min_words}+ words`}
              </span>
            </div>
          </div>
        </div>

        {/* Prompt excerpt */}
        <div className="px-4 py-3">
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
            {prompt.prompt_text}
          </p>
        </div>

        {/* CTA */}
        <div className="px-4 pb-4 pt-1">
          <CtaButton isAttempted={isAttempted} isBonusRetry={isBonusRetry} />
        </div>

      </div>
    </Link>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WritingTaskPromptsFolder({ taskNumber, prompts }: WritingTaskPromptsFolderProps) {
  const router    = useRouter();
  const { user }  = useCurrentUser();
  const { getToken } = useAuth();
  const plan      = user?.plan ?? "starter";

  const { writing_used_per_task } = useQuota("writing");

  // ── Which prompts has the user already attempted? ─────────────────────────
  const { data: attemptedPromptIds } = useQuery<string[]>({
    queryKey: ["attemptedWritingPrompts", taskNumber, user?.id],
    queryFn: async () => {
      const token = await getToken();
      return api.get<string[]>(
        `${API_V1}/writing/tasks/${taskNumber}/attempted-prompts`,
        { headers: authHeaders(token) },
      );
    },
    enabled: !!user && plan !== "starter",
    staleTime: 30_000,
  });
  const attemptedSet = new Set(attemptedPromptIds ?? []);

  // ── Quota maths ────────────────────────────────────────────────────────────
  const attemptsLimit: number | null =
    plan === "pro"
      ? PRO_PLAN_LIMITS.writing_attempts_per_task
      : plan === "ultra"
        ? ULTRA_PLAN_LIMITS.writing_attempts_per_task
        : null;

  const used         = (writing_used_per_task as Record<number, number> | undefined)?.[taskNumber] ?? 0;
  const isBonusRetry = attemptsLimit !== null && used >= attemptsLimit;
  const isStarter    = plan === "starter";

  const taskLabel       = TASK_LABELS[taskNumber] ?? `Task ${taskNumber}`;
  const taskDescription = TASK_DESCRIPTIONS[taskNumber] ?? "";
  const hasAnyPrompts   = prompts.length > 0;

  // Coming-soon slots: fill up to the plan limit
  const visibleLimit    = attemptsLimit ?? 5;
  const comingSoonCount = Math.max(0, visibleLimit - prompts.length);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* ── Back + Header ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Writing
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <PenLine className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{taskLabel}</h1>
            <p className="text-sm text-subtle mt-1">{taskDescription}</p>
          </div>
        </div>
      </div>

      {/* ── Locked banner (Starter) ────────────────────────────────────────── */}
      {isStarter && (
        <div className="rounded-xl border border-amber-700/30 bg-amber-950/40 p-4 flex items-center gap-4">
          <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-200">Task practice is locked</p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              Your Starter plan includes 1 writing mock test. Upgrade to Pro or Ultra to
              practice individual tasks with AI scoring.
            </p>
          </div>
          <Link
            href="/billing"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors border border-amber-400/30"
          >
            Upgrade
          </Link>
        </div>
      )}

      {/* ── Attempt progress bar ───────────────────────────────────────────── */}
      {!isStarter && (
        <div className="rounded-xl border border-white/[0.07] bg-surface px-4 py-3 flex items-center gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-subtle font-medium">
                {isBonusRetry
                  ? "Quota used — free retries active"
                  : `${used} of ${attemptsLimit ?? "∞"} attempts used`}
              </span>
              {isBonusRetry ? (
                <span className="text-amber-400 font-semibold">Retry mode ⚡</span>
              ) : (
                <span className="text-subtle">
                  {attemptsLimit !== null
                    ? `${Math.max(0, attemptsLimit - used)} remaining`
                    : "Unlimited"}
                </span>
              )}
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isBonusRetry ? "bg-amber-500" : "bg-primary",
                )}
                style={{
                  width: attemptsLimit
                    ? `${Math.min((used / attemptsLimit) * 100, 100)}%`
                    : "100%",
                }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-subtle">Plan</p>
            <p className="text-sm font-bold text-foreground capitalize">{plan}</p>
          </div>
        </div>
      )}

      {/* ── Prompts ────────────────────────────────────────────────────────── */}
      {!hasAnyPrompts ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-surface/50 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-white/25" />
          </div>
          <p className="text-base font-semibold text-foreground/60">No prompts yet</p>
          <p className="text-sm text-subtle max-w-sm mx-auto">
            We are adding prompts for this task soon. Check back later.
          </p>
          <div className={cn(
            BADGE_BASE,
            "mx-auto mt-2 bg-white/5 text-white/30 border-white/[0.08] text-xs py-1 px-3",
          )}>
            <Clock className="w-3 h-3 mr-1" />
            New prompts coming soon
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
              Available Prompts
            </h2>
            <span className="text-xs text-subtle">
              {prompts.length} prompt{prompts.length === 1 ? "" : "s"} available
            </span>
          </div>

          {/* Prompt grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prompts.map((prompt, i) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                index={i}
                isAttempted={attemptedSet.has(prompt.id)}
                isBonusRetry={isBonusRetry && !isStarter}
              />
            ))}

            {/* Coming soon placeholders */}
            {!isBonusRetry && comingSoonCount > 0 &&
              Array.from({ length: comingSoonCount }).map((_, i) => (
                <ComingSoonCard key={`cs-${i}`} index={prompts.length + i} />
              ))
            }
          </div>

          {/* Bonus retry note */}
          {isBonusRetry && !isStarter && (
            <div className="rounded-xl border border-amber-700/30 bg-amber-950/30 px-4 py-3 flex items-start gap-3 mt-2">
              <span className="text-amber-400 shrink-0 mt-0.5">⚡</span>
              <div>
                <p className="text-sm font-semibold text-amber-200">
                  Free retry mode — your quota is fully used
                </p>
                <p className="text-xs text-amber-300/70 mt-0.5">
                  You&apos;ve used all {attemptsLimit} attempts for this task. You can still
                  practice as many times as you like — these attempts don&apos;t count
                  against your quota.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
