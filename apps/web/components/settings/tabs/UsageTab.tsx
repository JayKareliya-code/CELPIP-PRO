"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/settings/tabs/UsageTab.tsx
//
// Displays the user's per-task attempt usage vs their plan quota.
// ─────────────────────────────────────────────────────────────────────────────

import { Mic, PenLine } from "lucide-react";

import { cn }             from "@/lib/utils";
import { useQuota }       from "@/lib/hooks/useQuota";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Section }        from "@/components/settings/shared/Section";

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
    <div className="flex items-center gap-3 animate-pulse">
      <div className="w-5 h-2 bg-white/[0.06] rounded shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2 bg-white/[0.06] rounded w-2/3" />
        <div className="h-1 bg-white/[0.04] rounded" />
      </div>
      <div className="w-10 h-2 bg-white/[0.06] rounded shrink-0" />
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
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold text-white/25 w-5 shrink-0 text-right tabular-nums">
        T{taskNum}
      </span>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs text-white/60 truncate">{taskLabel}</p>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          {isUnlimited ? (
            <div className="h-full w-full bg-primary/30 rounded-full" />
          ) : (
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isExhausted ? "bg-red-500/50" : pct > 80 ? "bg-amber-500/70" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
      </div>

      <div className="text-right shrink-0 min-w-[64px]">
        {isUnlimited ? (
          <span className="text-[10px] text-white/25">Unlimited</span>
        ) : (
          <span className={cn(
            "text-[10px] tabular-nums",
            isExhausted ? "text-red-400/70" : "text-white/40",
          )}>
            <span className={cn("font-semibold", isExhausted ? "text-red-400" : "text-white/70")}>
              {used}
            </span>
            {" / "}{effectiveLimit}
            {addonCredits > 0 && (
              <span className="text-primary/70 ml-1">+{addonCredits}</span>
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
    <div className="flex items-center gap-1.5 pb-1">
      <div className={cn(
        "w-5 h-5 rounded-md flex items-center justify-center",
        isSpeaking ? "bg-emerald-400/10" : "bg-blue-400/10",
      )}>
        {isSpeaking
          ? <Mic     className="w-3 h-3 text-emerald-400" />
          : <PenLine className="w-3 h-3 text-blue-400"    />
        }
      </div>
      <span className={cn(
        "text-[11px] font-semibold uppercase tracking-widest",
        isSpeaking ? "text-emerald-400" : "text-blue-400",
      )}>
        {isSpeaking ? "Speaking" : "Writing"}
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

  const speakingUsed   = speaking.speaking_used_per_task          ?? {};
  const writingUsed    = writing.writing_used_per_task            ?? {};
  const speakingAddons = speaking.speaking_addon_credits_per_task ?? {};
  const writingAddons  = writing.writing_addon_credits_per_task   ?? {};

  const isPro         = plan === "pro";
  const planTaskLimit = isPro ? 5 : 2;  // mirrors backend get_plan_limits

  const isLoading = speaking.isLoading || writing.isLoading;

  return (
    <div className="space-y-4">
      <Section
        title="Plan Quota"
        description="Attempts used per task this period. Retrying the same prompt is free and doesn't count."
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Speaking tasks 1–8 */}
            <div className="space-y-2.5">
              <SkillHeading skill="speaking" />
              <div className="space-y-2.5 pl-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <QuotaRow
                    key={n}
                    taskNum={n}
                    taskLabel={SPEAKING_LABELS[n] ?? `Task ${n}`}
                    used={speakingUsed[n] ?? 0}
                    limit={planTaskLimit}
                    addonCredits={speakingAddons[n] ?? 0}
                  />
                ))}
              </div>
            </div>

            {/* Writing tasks 1–2 */}
            <div className="space-y-2.5">
              <SkillHeading skill="writing" />
              <div className="space-y-2.5 pl-1">
                {[1, 2].map((n) => (
                  <QuotaRow
                    key={n}
                    taskNum={n}
                    taskLabel={WRITING_LABELS[n] ?? `Task ${n}`}
                    used={writingUsed[n] ?? 0}
                    limit={planTaskLimit}
                    addonCredits={writingAddons[n] ?? 0}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 pt-1 border-t border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[10px] text-white/30">Plan attempts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-primary/70">+N</span>
            <span className="text-[10px] text-white/30">Addon bonus attempts</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
