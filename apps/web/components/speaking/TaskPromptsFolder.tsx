"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TaskPromptsFolder — Folder-style view for all prompts of one task.
//
// Layout:
//   Breadcrumb → Page header (task name + meta) → Prompt cards grid
//
// Each prompt card shows:
//   - Prompt number (Prompt 1, 2, …)
//   - Difficulty badge
//   - Truncated prompt text excerpt
//   - Prep time + response time badges
//   - Start Practice CTA → /speaking/[taskNumber]/[promptId]/practice
//
// Empty/coming-soon state:
//   - If DB has N prompts < plan limit: show all + N "Coming Soon" placeholders
//   - If DB has 0 prompts: show full empty state with "New prompts coming soon"
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Mic,
  ChevronLeft,
  Sparkles,
  PlayCircle,
  RotateCcw,
  Lock,
  Timer,
  ImageIcon,
} from "lucide-react";
import { BreadcrumbNav }    from "@/components/layout/BreadcrumbNav";
import { useCurrentUser }   from "@/lib/hooks/useCurrentUser";
import { useQuota }         from "@/lib/hooks/useQuota";
import { cn }               from "@/lib/utils";
import { formatShortDuration } from "@/lib/utils";
import { API_V1, api, authHeaders } from "@/lib/api";
import {
  PRO_PLAN_LIMITS,
  ULTRA_PLAN_LIMITS,
} from "@/lib/constants";
import {
  SPEAKING_TASK_TITLES,
  SPEAKING_TASK_DESCRIPTIONS,
} from "@/lib/speaking-constants";
import type { SpeakingTask, Difficulty } from "@/lib/types";

/** Task numbers that use a scene image (Tasks 3, 4, 8). */
const IMAGE_TASKS = new Set([3, 4, 8]);

// TASK_LABELS and TASK_DESCRIPTIONS are imported from @/lib/speaking-constants
// (single source of truth — no local duplicates).
//
// Note: TASK_LABELS in this file previously formatted as "Task N — Title"; we
// now build that format inline where needed to avoid a separate derived map.

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; classes: string }> = {
  easy:   { label: "Easy",   classes: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50" },
  medium: { label: "Medium", classes: "bg-amber-900/40   text-amber-400   border-amber-800/50"  },
  hard:   { label: "Hard",   classes: "bg-red-900/40     text-red-400     border-red-800/50"    },
};

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none select-none";

function formatTime(secs: number): string {
  return formatShortDuration(secs);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TaskPromptsFolderProps {
  taskNumber: number;
  prompts: SpeakingTask[];
}

// ── Shared Card Header ──────────────────────────────────────────────────────
// Extracted to eliminate the copy-paste between image-split and stacked layouts.
// Any badge change only needs to happen here once.

function CardHeader({
  index,
  prompt,
  isAlreadyAttempted,
  isBonusRetry,
}: {
  index:              number;
  prompt:             SpeakingTask;
  isAlreadyAttempted: boolean;
  isBonusRetry:       boolean;
}) {
  const diffCfg = DIFFICULTY_CONFIG[prompt.difficulty];
  return (
    <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={cn(BADGE_BASE, "bg-white/[0.06] text-white/40 border-white/[0.08]")}>
            Prompt {index + 1}
          </span>
          <span className={cn(BADGE_BASE, diffCfg.classes)}>
            {diffCfg.label}
          </span>
          {isAlreadyAttempted && (
            <span className={cn(BADGE_BASE, "bg-amber-900/30 text-amber-400 border-amber-700/40")}>
              Attempted
            </span>
          )}
          {isBonusRetry && (
            <span className={cn(BADGE_BASE, "bg-amber-900/30 text-amber-400 border-amber-700/40")}>
              Retry mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-subtle/70">
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {formatTime(prompt.prep_time_seconds)} prep
          </span>
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3" />
            {formatTime(prompt.response_time_seconds)} speak
          </span>
          {prompt.has_parts && (
            <span className={cn(BADGE_BASE, "bg-amber-900/30 text-amber-300 border-amber-700/40")}>
              2 parts
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Prompt Card ───────────────────────────────────────────────────────────────

function PromptCard({
  prompt,
  index,
  taskNumber,
  isAlreadyAttempted,
  isBonusRetry,
}: {
  prompt: SpeakingTask;
  index: number;
  taskNumber: number;
  isAlreadyAttempted: boolean;
  isBonusRetry: boolean;
}) {
  const isImageTask = IMAGE_TASKS.has(taskNumber);
  const imageUrl = prompt.context_image_url;

  return (
    <Link
      href={`/speaking/${prompt.id}/practice`}
      className="group flex h-full"
    >
      <div className="flex flex-col h-full w-full rounded-xl border border-border bg-surface hover:border-white/[0.18] hover:shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all duration-200 overflow-hidden">

        {isImageTask ? (
          /* ── Split layout: image-left / content-right (Tasks 3, 4, 8) ─── */
          <div className="flex flex-1 min-h-[180px]">

            {/* Left – scene image pane (fixed-width: 38%) */}
            <div className="relative w-[38%] shrink-0 self-stretch min-h-[160px] max-h-[220px] overflow-hidden">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Scene"
                  className="absolute inset-0 w-full h-full object-contain bg-white/[0.03] blur-sm scale-105 transition-[filter] duration-300"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 bg-white/[0.03] border-r border-dashed border-white/[0.08] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1 text-subtle/30">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-[10px]">Scene image</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right – content pane */}
            <div className="flex flex-col flex-1 min-w-0 border-l border-white/[0.06]">
              <CardHeader
                index={index}
                prompt={prompt}
                isAlreadyAttempted={isAlreadyAttempted}
                isBonusRetry={isBonusRetry}
              />
              <div className="px-4 py-3 flex-1">
                <p className="text-sm text-foreground/80 leading-relaxed">{prompt.prompt_text}</p>
              </div>
              <div className="px-4 pb-4 pt-1 shrink-0">
                <CtaButton isAlreadyAttempted={isAlreadyAttempted} isBonusRetry={isBonusRetry} />
              </div>
            </div>
          </div>

        ) : (
          /* ── Stacked layout for text-only tasks ── */
          <>
            <CardHeader
              index={index}
              prompt={prompt}
              isAlreadyAttempted={isAlreadyAttempted}
              isBonusRetry={isBonusRetry}
            />
            <div className="px-4 py-3 flex-1">
              <p className="text-sm text-foreground/80 leading-relaxed">{prompt.prompt_text}</p>
            </div>
            <div className="px-4 pb-4 pt-1 shrink-0">
              <CtaButton isAlreadyAttempted={isAlreadyAttempted} isBonusRetry={isBonusRetry} />
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

// ── CTA Button ───────────────────────────────────────────────────────────────
// Three states:
//   isAlreadyAttempted → green "Redo" button
//   isBonusRetry       → amber "Practice Again (Free Retry)"
//   default            → indigo "Start Practice"

function CtaButton({
  isAlreadyAttempted,
  isBonusRetry,
}: {
  isAlreadyAttempted: boolean;
  isBonusRetry:       boolean;
}) {
  if (isAlreadyAttempted && !isBonusRetry) {
    return (
      <div className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
        "text-sm font-semibold transition-all duration-150",
        "bg-amber-700/60 group-hover:bg-amber-700/80",
        "text-amber-100 border border-amber-600/40 group-hover:border-amber-500/60",
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
      Start Practice
    </div>
  );
}

// ── Coming Soon Placeholder ───────────────────────────────────────────────────

function ComingSoonCard({ index }: { index: number }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-surface/50 overflow-hidden opacity-50">
      {/* Header skeleton */}
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
      {/* Body placeholder */}
      <div className="px-4 py-4 space-y-2">
        <div className="h-3 bg-white/[0.04] rounded w-full" />
        <div className="h-3 bg-white/[0.04] rounded w-5/6" />
        <div className="h-3 bg-white/[0.04] rounded w-2/3" />
      </div>
      {/* CTA placeholder */}
      <div className="px-4 pb-4 pt-1">
        <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-semibold text-white/20">
          <Sparkles className="w-4 h-4" />
          New Prompt — Coming Soon
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TaskPromptsFolder({ taskNumber, prompts }: TaskPromptsFolderProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { getToken } = useAuth();
  const plan     = user?.plan ?? "starter";

  const { speaking_used_per_task, isLoading: quotaLoading } = useQuota("speaking");

  // ── Fetch which prompts this user has already attempted ───────────────────
  const { data: attemptedPromptIds } = useQuery<string[]>({
    queryKey: ["attemptedPrompts", taskNumber, user?.id],
    queryFn: async () => {
      const token = await getToken();
      return api.get<string[]>(
        `${API_V1}/speaking/tasks/${taskNumber}/attempted-prompts`,
        { headers: authHeaders(token) },
      );
    },
    enabled: !!user && !user.plan.includes("starter"),
    staleTime: 30_000,
  });
  const attemptedSet = new Set(attemptedPromptIds ?? []);

  const attemptsLimit: number | null =
    plan === "pro"
      ? PRO_PLAN_LIMITS.speaking_attempts_per_task
      : plan === "ultra"
      ? ULTRA_PLAN_LIMITS.speaking_attempts_per_task
      : null;

  const used = (speaking_used_per_task as Record<number, number> | undefined)?.[taskNumber] ?? 0;
  const isBonusRetry = attemptsLimit !== null && used >= attemptsLimit;
  const isStarter    = plan === "starter";

  // Build a "Task N — Title" label for the page header.
  const taskLabel       = taskNumber === 0
    ? "Practice Task"
    : `Task ${taskNumber} — ${SPEAKING_TASK_TITLES[taskNumber] ?? `Task ${taskNumber}`}`;
  const taskDescription = SPEAKING_TASK_DESCRIPTIONS[taskNumber] ?? "";
  const isImageTask     = IMAGE_TASKS.has(taskNumber);

  // How many "coming soon" placeholders to show?
  // Show placeholders up to the plan's attempt limit so users see future slots.
  const visibleLimit = attemptsLimit ?? 5; // fallback for starter (though locked)
  const comingSoonCount = Math.max(0, visibleLimit - prompts.length);

  const hasAnyPrompts = prompts.length > 0;

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
          Back to Speaking
        </button>

        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0",
            isImageTask
              ? "bg-teal-600/20 border-teal-500/30"
              : "bg-amber-600/20 border-amber-500/30"
          )}>
            {isImageTask
              ? <ImageIcon className="w-6 h-6 text-teal-400" />
              : <Mic className="w-6 h-6 text-amber-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{taskLabel}</h1>
            <p className="text-sm text-subtle mt-1">{taskDescription}</p>
            {isImageTask && (
              <span className={cn(BADGE_BASE, "mt-2 bg-teal-900/30 text-teal-400 border-teal-700/40 py-0.5 px-2")}
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                Image-based task
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Locked banner for Starter ──────────────────────────────────────── */}
      {isStarter && (
        <div className="rounded-xl border border-amber-700/30 bg-amber-950/40 p-4 flex items-center gap-4">
          <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-200">Task practice is locked</p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              Your Starter plan includes 1 speaking mock test. Upgrade to Pro or Ultra to
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
                  isBonusRetry
                    ? "bg-amber-500"
                    : "bg-primary"
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

      {/* ── Prompts ─────────────────────────────────────────────────────────── */}
      {/* Gate on quotaLoading to prevent stale-quota UI flash:
          While quota data is in-flight, 'used' defaults to 0, which would
          briefly show non-bonus CTA buttons to exhausted-quota users. */}
      {quotaLoading ? (
        <div className="rounded-xl border border-white/[0.07] bg-surface/50 p-8 flex items-center justify-center">
          <span className="text-sm text-subtle animate-pulse">Loading…</span>
        </div>
      ) : !hasAnyPrompts ? (
        /* Full empty state */
        <div className="rounded-xl border border-dashed border-white/10 bg-surface/50 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-white/25" />
          </div>
          <p className="text-base font-semibold text-foreground/60">No prompts yet</p>
          <p className="text-sm text-subtle max-w-sm mx-auto">
            We are adding prompts for this task soon. Check back later — new practice
            materials land regularly.
          </p>
          <div className={cn(
            BADGE_BASE,
            "mx-auto mt-2 bg-white/5 text-white/30 border-white/[0.08] text-xs py-1 px-3"
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
                taskNumber={taskNumber}
                isAlreadyAttempted={attemptedSet.has(prompt.id)}
                isBonusRetry={isBonusRetry && !isStarter}
              />
            ))}

            {/* Coming soon placeholders */}
            {!isBonusRetry && comingSoonCount > 0 && Array.from({ length: comingSoonCount }).map((_, i) => (
              <ComingSoonCard key={`cs-${i}`} index={prompts.length + i} />
            ))}
          </div>

          {/* Info note when in bonus retry mode */}
          {isBonusRetry && (
            <div className="rounded-xl border border-amber-700/30 bg-amber-950/30 px-4 py-3 flex items-start gap-3 mt-2">
              <span className="text-amber-400 shrink-0 mt-0.5">⚡</span>
              <div>
                <p className="text-sm font-semibold text-amber-200">
                  Free retry mode — your quota is fully used
                </p>
                <p className="text-xs text-amber-300/70 mt-0.5">
                  You&apos;ve used all {attemptsLimit} attempts for this task. You can still
                  practice as many times as you like — your prompt will stay the same
                  and these attempts don&apos;t count against your quota.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
