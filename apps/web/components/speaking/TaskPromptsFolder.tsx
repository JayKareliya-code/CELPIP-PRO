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
// Quota logic:
//   - effectiveLimit = planLimit + addonCredits (from useSpeakingQuota)
//   - used = distinct prompts with a COMPLETED attempt
//   - quotaExhausted = used >= effectiveLimit
//   - A prompt is FREE to redo if user has already completed it (any time)
//   - A prompt is LOCKED if quota is exhausted AND user has NOT completed it yet
//   - "Coming soon" placeholders fill the grid up to effectiveLimit
//
// Empty/coming-soon state:
//   - If DB has N prompts < effectiveLimit: show all + N "Coming Soon" placeholders
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
  Timer,
  ImageIcon,
  Lock,
} from "lucide-react";
import { BreadcrumbNav }    from "@/components/layout/BreadcrumbNav";
import { MicPermissionNotice } from "@/components/speaking/MicPermissionNotice";
import { useCurrentUser }   from "@/lib/hooks/useCurrentUser";
import { useSpeakingQuota } from "@/lib/hooks/useSpeakingQuota";
import { cn }               from "@/lib/utils";
import { formatShortDuration } from "@/lib/utils";
import { API_V1, api, authHeaders } from "@/lib/api";
import {
  SPEAKING_TASK_TITLES,
  SPEAKING_TASK_DESCRIPTIONS,
} from "@/lib/speaking-constants";
import { TaskUpsellCard } from "@/components/billing/TaskUpsellCard";
import type { SpeakingTask, Difficulty } from "@/lib/types";

/** Task numbers that use a scene image (Tasks 3, 4, 8). */
const IMAGE_TASKS = new Set([3, 4, 8]);

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

function CardHeader({
  index,
  prompt,
  isAlreadyAttempted,
  isQuotaLocked,
}: {
  index:              number;
  prompt:             SpeakingTask;
  isAlreadyAttempted: boolean;
  isQuotaLocked:      boolean;
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
            <span className={cn(BADGE_BASE, "bg-emerald-900/30 text-emerald-400 border-emerald-700/40")}>
              Completed
            </span>
          )}
          {isQuotaLocked && !isAlreadyAttempted && (
            <span className={cn(BADGE_BASE, "bg-white/[0.05] text-white/30 border-white/[0.08]")}>
              Quota reached
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
  isQuotaLocked,
}: {
  prompt: SpeakingTask;
  index: number;
  taskNumber: number;
  isAlreadyAttempted: boolean;
  isQuotaLocked: boolean;
}) {
  const isImageTask = IMAGE_TASKS.has(taskNumber);
  const imageUrl = prompt.context_image_url;

  const cardContent = (
    <div className={cn(
      "flex flex-col h-full w-full rounded-xl border bg-surface transition-all duration-200 overflow-hidden",
      isQuotaLocked
        ? "border-border opacity-60 cursor-not-allowed"
        : "border-border hover:border-white/[0.18] hover:shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
    )}>
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
              isQuotaLocked={isQuotaLocked}
            />
            <div className="px-4 py-3 flex-1">
              <p className="text-sm text-foreground/80 leading-relaxed">{prompt.prompt_text}</p>
            </div>
            <div className="px-4 pb-4 pt-1 shrink-0">
              <CtaButton isAlreadyAttempted={isAlreadyAttempted} isQuotaLocked={isQuotaLocked} />
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
            isQuotaLocked={isQuotaLocked}
          />
          <div className="px-4 py-3 flex-1">
            <p className="text-sm text-foreground/80 leading-relaxed">{prompt.prompt_text}</p>
          </div>
          <div className="px-4 pb-4 pt-1 shrink-0">
            <CtaButton isAlreadyAttempted={isAlreadyAttempted} isQuotaLocked={isQuotaLocked} />
          </div>
        </>
      )}
    </div>
  );

  // Locked prompts are not links — quota is exhausted for new prompts.
  if (isQuotaLocked) {
    return <div className="group flex h-full">{cardContent}</div>;
  }

  return (
    <Link
      href={`/speaking/${prompt.id}/practice`}
      className="group flex h-full"
    >
      {cardContent}
    </Link>
  );
}

// ── CTA Button ───────────────────────────────────────────────────────────────
// Three states:
//   isAlreadyAttempted → amber "Redo" button
//   isQuotaLocked      → greyed "Quota Reached" (not a link)
//   default            → indigo "Start Practice"

function CtaButton({
  isAlreadyAttempted,
  isQuotaLocked,
}: {
  isAlreadyAttempted: boolean;
  isQuotaLocked:      boolean;
}) {
  if (isAlreadyAttempted) {
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
  if (isQuotaLocked) {
    return (
      <div className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
        "text-sm font-semibold",
        "bg-white/[0.03] text-white/25 border border-white/[0.06]",
      )}>
        <Lock className="w-4 h-4" />
        Quota Reached
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

  // Centralised quota: effectiveLimit = planLimit + addonCredits for THIS task.
  // "used" counts COMPLETED attempts only — quota consumed at completion.
  // Redo of any completed prompt is always free.
  const {
    plan,
    effectiveLimit: attemptsLimit,
    addonCredits,
    used,
    remaining,
    isLoading: quotaLoading,
  } = useSpeakingQuota(taskNumber);

  const isStarter          = plan === "starter";
  const quotaExhausted     = used >= attemptsLimit;
  const hasTaskAddonCredit = addonCredits > 0;

  const { data: attemptedPromptIds } = useQuery<string[]>({
    queryKey: ["attemptedPrompts", taskNumber, user?.id],
    queryFn: async () => {
      const token = await getToken();
      return api.get<string[]>(
        `${API_V1}/speaking/tasks/${taskNumber}/attempted-prompts`,
        { headers: authHeaders(token) },
      );
    },
    enabled: !!user,
    staleTime: 10_000,          // 10 s — stay fresh after returning from a session
    refetchOnWindowFocus: true, // re-check after returning from practice or billing
  });
  const attemptedSet = new Set(attemptedPromptIds ?? []);

  // Build a "Task N — Title" label for the page header.
  const taskLabel       = taskNumber === 0
    ? "Practice Task"
    : `Task ${taskNumber} — ${SPEAKING_TASK_TITLES[taskNumber] ?? `Task ${taskNumber}`}`;
  const taskDescription = SPEAKING_TASK_DESCRIPTIONS[taskNumber] ?? "";
  const isImageTask     = IMAGE_TASKS.has(taskNumber);

  // Slice prompts to effectiveLimit — Starter users (quota=2) should only see
  // as many prompt cards as their plan allows, not every prompt in the DB.
  // Pro users (quota=5) see up to 5; addon credits expand both plans equally.
  // Gated on !quotaLoading to prevent a flash of all prompts before quota resolves.
  const visiblePrompts  = quotaLoading ? prompts : prompts.slice(0, attemptsLimit);

  // How many "coming soon" placeholders to show?
  // Fill up to effectiveLimit so users know how many prompts they'll eventually get.
  const comingSoonCount = Math.max(0, attemptsLimit - visiblePrompts.length);
  const hasAnyPrompts   = visiblePrompts.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* Mic permission prompt — only renders when permission is not granted */}
      <MicPermissionNotice />

      {/* ── Back + Header + Progress — col 1 | Upsell card — col 2 ──────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[65%_1fr] gap-4 items-end">

        {/* Col 1: back button + task identity + progress bar */}
        <div className="space-y-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Speaking
          </button>

          {/* Task identity */}
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
                <span className={cn(BADGE_BASE, "mt-2 bg-teal-900/30 text-teal-400 border-teal-700/40 py-0.5 px-2")}>
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Image-based task
                </span>
              )}
            </div>
          </div>

          {/* Attempt progress bar */}
          <div className="rounded-xl border border-white/[0.07] bg-surface px-4 py-3 flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-subtle font-medium">
                  {`${used} of ${attemptsLimit} attempts used`}
                </span>
                <span className="text-subtle">{remaining} remaining</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-primary"
                  style={{ width: `${Math.min((used / attemptsLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-subtle">Plan</p>
              <p className="text-sm font-bold text-foreground capitalize">{plan}</p>
            </div>
          </div>
        </div>

        {/* Col 2: task pack upsell card */}
        <TaskUpsellCard skill="speaking" taskNumber={taskNumber} />
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.18]" />


      {/* ── Prompts ─────────────────────────────────────────────────────────── */}
      {/* Gate on quotaLoading to prevent stale-quota UI flash */}
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
              {visiblePrompts.length} prompt{visiblePrompts.length === 1 ? "" : "s"} available
            </span>
          </div>

          {/* Prompt grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visiblePrompts.map((prompt, i) => {
              const isAlreadyAttempted = attemptedSet.has(prompt.id);
              // Lock new (not yet completed) prompts when quota is exhausted.
              // Completed prompts are always accessible as free redos.
              const isQuotaLocked = quotaExhausted && !isAlreadyAttempted;

              return (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  index={i}
                  taskNumber={taskNumber}
                  isAlreadyAttempted={isAlreadyAttempted}
                  isQuotaLocked={isQuotaLocked}
                />
              );
            })}

            {/* Coming soon placeholders — fill up to effectiveLimit */}
            {comingSoonCount > 0 && Array.from({ length: comingSoonCount }).map((_, i) => (
              <ComingSoonCard key={`cs-${i}`} index={visiblePrompts.length + i} />
            ))}
          </div>

          {/* Quota exhausted note */}
          {quotaExhausted && (
            <div className="rounded-xl border border-white/[0.08] bg-surface/60 px-4 py-3 flex items-start gap-3 mt-2">
              <Lock className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground/70">
                  All {attemptsLimit} attempts used for this task
                </p>
                <p className="text-xs text-subtle mt-0.5">
                  You can still redo any completed prompt for free.
                  {isStarter && !hasTaskAddonCredit
                    ? " Upgrade to Pro or purchase an add-on for more new prompts."
                    : " Purchase an add-on pack to unlock additional questions."}
                </p>
                <Link
                  href="/billing"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary/70 hover:text-primary transition-colors font-medium"
                >
                  Get more attempts →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
