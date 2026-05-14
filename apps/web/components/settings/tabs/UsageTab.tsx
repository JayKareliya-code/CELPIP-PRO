"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/settings/tabs/UsageTab.tsx
//
// Displays the user's per-task attempt usage vs their plan quota.
// ─────────────────────────────────────────────────────────────────────────────

import { Mic, PenLine, ClipboardList } from "lucide-react";

import { cn }             from "@/lib/utils";
import { useQuota }       from "@/lib/hooks/useQuota";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Section }        from "@/components/settings/shared/Section";
import { PRO_PLAN_LIMITS } from "@/lib/constants";

// ── Task label tables ─────────────────────────────────────────────────────────

const SPEAKING_LABELS: Record<number, string> = {
  1: "Giving Advice",
  2: "Personal Experience",
  3: "Describing a Scene",
  4: "Making Predictions",
  5: "Comparing & Persuading",
  6: "Difficult Situation",
  7: "Expressing Opinions",
  8: "Unusual Situation",
};

const WRITING_LABELS: Record<number, string> = {
  1: "Writing an Email",
  2: "Writing an Opinion Essay",
};

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 animate-pulse">
      <div className="w-8 h-3 bg-white/[0.06] rounded shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-white/[0.06] rounded w-2/3" />
        <div className="h-1.5 bg-white/[0.04] rounded" />
      </div>
      <div className="w-16 h-3 bg-white/[0.06] rounded shrink-0" />
    </div>
  );
}

// ── Quota row ─────────────────────────────────────────────────────────────────

interface QuotaRowProps {
  taskNum:      number;
  taskLabel:    string;
  used:         number;
  limit:        number | null;   // null = unlimited
  addonCredits: number;          // bonus on top of plan limit
}

function QuotaRow({ taskNum, taskLabel, used, limit, addonCredits }: QuotaRowProps) {
  const isUnlimited    = limit === null;
  const effectiveLimit = isUnlimited ? null : limit + addonCredits;
  const pct            = effectiveLimit ? Math.min((used / effectiveLimit) * 100, 100) : 0;
  const remaining      = effectiveLimit !== null ? Math.max(0, effectiveLimit - used) : null;
  const isExhausted    = remaining === 0 && !isUnlimited;

  return (
    <div className="flex items-center gap-4 group">
      {/* Task badge */}
      <span className="text-[11px] font-bold text-white/30 w-7 shrink-0 text-right tabular-nums">
        T{taskNum}
      </span>

      {/* Label + progress */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-medium text-white/70 truncate group-hover:text-white/90 transition-colors duration-150">
          {taskLabel}
        </p>
        <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
          {isUnlimited ? (
            <div className="h-full w-full bg-primary/30 rounded-full" />
          ) : (
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isExhausted ? "bg-red-500/60" : pct > 80 ? "bg-amber-500/80" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
      </div>

      {/* Counter */}
      <div className="text-right shrink-0 min-w-[80px]">
        {isUnlimited ? (
          <span className="text-xs text-white/30">Unlimited</span>
        ) : (
          <span className={cn(
            "text-xs tabular-nums",
            isExhausted ? "text-red-400/70" : "text-white/40",
          )}>
            <span className={cn("font-bold text-sm", isExhausted ? "text-red-400" : "text-white/80")}>
              {used}
            </span>
            <span className="text-white/30">{" / "}{effectiveLimit}</span>
            {addonCredits > 0 && (
              <span className="text-primary/80 ml-1 font-semibold">+{addonCredits}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Mock row ──────────────────────────────────────────────────────────────────

interface MockRowProps {
  skill:        "Speaking" | "Writing";
  used:         number;
  limit:        number | null;
  addonCredits: number;
}

function MockRow({ skill, used, limit, addonCredits }: MockRowProps) {
  const isUnlimited    = limit === null;
  const effectiveLimit = isUnlimited ? null : limit + addonCredits;
  const pct            = effectiveLimit ? Math.min((used / effectiveLimit) * 100, 100) : 0;
  const isExhausted    = effectiveLimit !== null && used >= effectiveLimit;

  return (
    <div className="flex items-center gap-4 group">
      <span className="text-[11px] font-bold text-white/30 w-7 shrink-0 text-right">
        {skill.slice(0, 2).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors duration-150">
          {skill} Mock
        </p>
        <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
          {isUnlimited ? (
            <div className="h-full w-full bg-violet-400/30 rounded-full" />
          ) : (
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isExhausted ? "bg-red-500/60" : pct > 80 ? "bg-amber-500/80" : "bg-violet-400",
              )}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
      </div>
      <div className="text-right shrink-0 min-w-[80px]">
        {isUnlimited ? (
          <span className="text-xs text-white/30">Unlimited</span>
        ) : (
          <span className={cn("text-xs tabular-nums", isExhausted ? "text-red-400/70" : "text-white/40")}>
            <span className={cn("font-bold text-sm", isExhausted ? "text-red-400" : "text-white/80")}>{used}</span>
            <span className="text-white/30">{" / "}{effectiveLimit}</span>
            {addonCredits > 0 && (
              <span className="text-violet-400/80 ml-1 font-semibold">+{addonCredits}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Skill heading ─────────────────────────────────────────────────────────────

function SkillHeading({ skill }: { skill: "speaking" | "writing" }) {
  const isSpeaking = skill === "speaking";
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={cn(
        "w-6 h-6 rounded-lg flex items-center justify-center",
        isSpeaking ? "bg-emerald-400/15 border border-emerald-400/20" : "bg-blue-400/15 border border-blue-400/20",
      )}>
        {isSpeaking
          ? <Mic     className="w-3.5 h-3.5 text-emerald-400" />
          : <PenLine className="w-3.5 h-3.5 text-blue-400"    />
        }
      </div>
      <span className={cn(
        "text-xs font-bold uppercase tracking-widest",
        isSpeaking ? "text-emerald-400" : "text-blue-400",
      )}>
        {isSpeaking ? "Speaking" : "Writing"}
      </span>
    </div>
  );
}

// ── Mock heading ──────────────────────────────────────────────────────────────

function MockHeading() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg bg-violet-400/15 border border-violet-400/20 flex items-center justify-center">
        <ClipboardList className="w-3.5 h-3.5 text-violet-400" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-violet-400">
        Mock Tests
      </span>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function UsageTab() {
  const { user } = useCurrentUser();
  const plan     = user?.plan ?? "starter";

  const speaking = useQuota("speaking");
  const writing  = useQuota("writing");

  const speakingUsed    = speaking.speaking_used_per_task          ?? {};
  const writingUsed     = writing.writing_used_per_task            ?? {};
  const speakingAddons  = speaking.speaking_addon_credits_per_task ?? {};
  const writingAddons   = writing.writing_addon_credits_per_task   ?? {};

  const isPro = plan === "pro";
  const fallbackLimit = isPro ? 5 : 2;

  const sMockUsed    = speaking.speaking_mock_tests_used    ?? 0;
  const wMockUsed    = writing.writing_mock_tests_used      ?? 0;
  const sMockLimit   = speaking.speaking_mock_tests_limit   ?? (isPro ? PRO_PLAN_LIMITS.speaking_mock_tests : 0);
  const wMockLimit   = writing.writing_mock_tests_limit     ?? (isPro ? PRO_PLAN_LIMITS.writing_mock_tests  : 0);
  const sMockAddon   = speaking.speaking_mock_addon_credits ?? 0;
  const wMockAddon   = writing.writing_mock_addon_credits   ?? 0;

  const speakingPlanLimit: number = speaking.speaking_limit_per_task ?? fallbackLimit;
  const writingPlanLimit:  number = writing.writing_limit_per_task   ?? fallbackLimit;

  const isLoading = speaking.isLoading || writing.isLoading;

  return (
    <div className="space-y-4">
      <Section
        title="Plan Quota"
        description="Attempts used per task this period. Retrying the same prompt is free and doesn't count."
      >
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : (
          <div className="space-y-7">

            {/* Speaking tasks 1–8 */}
            <div>
              <SkillHeading skill="speaking" />
              <div className="space-y-3 pl-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <QuotaRow
                    key={n}
                    taskNum={n}
                    taskLabel={SPEAKING_LABELS[n] ?? `Task ${n}`}
                    used={speakingUsed[n] ?? 0}
                    limit={speakingPlanLimit}
                    addonCredits={speakingAddons[n] ?? 0}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06]" />

            {/* Writing tasks 1–2 */}
            <div>
              <SkillHeading skill="writing" />
              <div className="space-y-3 pl-1">
                {[1, 2].map((n) => (
                  <QuotaRow
                    key={n}
                    taskNum={n}
                    taskLabel={WRITING_LABELS[n] ?? `Task ${n}`}
                    used={writingUsed[n] ?? 0}
                    limit={writingPlanLimit}
                    addonCredits={writingAddons[n] ?? 0}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06]" />

            {/* Mock Tests */}
            <div>
              <MockHeading />
              <div className="space-y-3 pl-1">
                <MockRow skill="Speaking" used={sMockUsed} limit={sMockLimit} addonCredits={sMockAddon} />
                <MockRow skill="Writing"  used={wMockUsed} limit={wMockLimit} addonCredits={wMockAddon} />
              </div>
            </div>

          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-5 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-xs text-white/35">Plan attempts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary/70">+N</span>
            <span className="text-xs text-white/35">Addon bonus attempts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="text-xs text-white/35">Exhausted</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
