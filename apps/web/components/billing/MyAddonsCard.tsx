"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MyAddonsCard.tsx — Billing page inventory card for purchased addon credits
//
// Shows the user's addon credit balances per skill and task:
//   ┌──────────────────────────────────────────────────┐
//   │ My Practice Packs                                │
//   │ ─────────────────────────────────────────────── │
//   │ Speaking                                         │
//   │   Task 1 · Giving Advice   ████░░░░  3 of 5 used│
//   │   Task 4 · Making Predictions ██████  5 of 5 ✓  │
//   │ Writing                                          │
//   │   Task 1 · Email            ░░░░░░░  0 of 5 used│
//   └──────────────────────────────────────────────────┘
//
// Renders nothing if the user has never purchased any addon credit.
// Shows a skeleton while loading.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";
import { Sparkles, Mic, PenLine, ClipboardList } from "lucide-react";
import { useAddonCredits } from "@/lib/hooks/useAddonCredits";
import type { TaskCreditStat, MockCreditStat } from "@/lib/types";

// ── Task label tables ─────────────────────────────────────────────────────────

const SPEAKING_TASK_LABELS: Record<number, string> = {
  1: "Giving Advice",
  2: "Personal Experience",
  3: "Describing a Scene",
  4: "Making Predictions",
  5: "Comparing & Persuading",
  6: "Difficult Situation",
  7: "Expressing Opinions",
  8: "Unusual Situation",
};

const WRITING_TASK_LABELS: Record<number, string> = {
  1: "Writing an Email",
  2: "Writing an Opinion Essay",
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface TaskCreditRowProps {
  taskNum:   number;
  taskLabel: string;
  stat:      TaskCreditStat;
}

function TaskCreditRow({ taskNum, taskLabel, stat }: TaskCreditRowProps) {
  const used        = stat.purchased - stat.available;
  const total       = stat.purchased;
  const pct         = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isExhausted = stat.available === 0;

  return (
    <div className="flex items-center gap-3">
      {/* Task badge */}
      <span className="text-[10px] font-bold text-white/25 w-6 shrink-0 text-right tabular-nums">
        T{taskNum}
      </span>

      {/* Label + bar */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs text-white/60 truncate">{taskLabel}</p>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isExhausted ? "bg-white/20" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stat */}
      <div className="text-right shrink-0">
        {isExhausted ? (
          <span className="text-[10px] font-semibold text-white/30">
            {used}/{total} <span className="text-white/20">used</span>
          </span>
        ) : (
          <span className="text-[10px] font-semibold tabular-nums text-white/50">
            <span className="text-primary font-bold">{stat.available}</span>
            <span className="text-white/25"> / {total} left</span>
          </span>
        )}
      </div>
    </div>
  );
}


interface SkillSectionProps {
  skill:      "speaking" | "writing";
  taskMap:    Record<number, TaskCreditStat>;
  labelTable: Record<number, string>;
}

function SkillSection({ skill, taskMap, labelTable }: SkillSectionProps) {
  const taskNums = Object.keys(taskMap)
    .map(Number)
    .sort((a, b) => a - b);

  if (taskNums.length === 0) return null;

  const Icon       = skill === "speaking" ? Mic : PenLine;
  const accentText = skill === "speaking" ? "text-emerald-400" : "text-blue-400";
  const accentBg   = skill === "speaking" ? "bg-emerald-400/10" : "bg-blue-400/10";

  return (
    <div className="space-y-2.5">
      {/* Skill header */}
      <div className="flex items-center gap-1.5">
        <div className={cn("w-5 h-5 rounded-md flex items-center justify-center", accentBg)}>
          <Icon className={cn("w-3 h-3", accentText)} />
        </div>
        <span className={cn("text-[11px] font-semibold uppercase tracking-widest", accentText)}>
          {skill === "speaking" ? "Speaking" : "Writing"}
        </span>
      </div>

      {/* Task rows */}
      <div className="space-y-2.5 pl-1">
        {taskNums.map((n) => (
          <TaskCreditRow
            key={n}
            taskNum={n}
            taskLabel={labelTable[n] ?? `Task ${n}`}
            stat={taskMap[n]}
          />
        ))}
      </div>
    </div>
  );
}

// ── MockSection ──────────────────────────────────────────────────────────────

function MockSection({ mock }: { mock: Record<string, MockCreditStat> }) {
  const skills = Object.keys(mock).sort(); // speaking, writing
  if (skills.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {/* Section header */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-md bg-violet-400/10 flex items-center justify-center">
          <ClipboardList className="w-3 h-3 text-violet-400" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-violet-400">
          Mock Tests
        </span>
      </div>

      {/* Credit rows */}
      <div className="space-y-2.5 pl-1">
        {skills.map((skill) => {
          const stat = mock[skill];
          const used        = stat.purchased - stat.available;
          const pct         = stat.purchased > 0 ? Math.min((used / stat.purchased) * 100, 100) : 0;
          const isExhausted = stat.available === 0;
          return (
            <div key={skill} className="flex items-center gap-3">
              {/* Skill badge */}
              <span className="text-[10px] font-bold text-white/25 w-6 shrink-0 text-right capitalize">
                {skill.slice(0, 2).toUpperCase()}
              </span>
              {/* Label + bar */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs text-white/60 capitalize">{skill}</p>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isExhausted ? "bg-white/20" : "bg-violet-400",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              {/* Stat */}
              <div className="text-right shrink-0">
                {isExhausted ? (
                  <span className="text-[10px] font-semibold text-white/30">
                    {used}/{stat.purchased} <span className="text-white/20">used</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold tabular-nums text-white/50">
                    <span className="text-violet-400 font-bold">{stat.available}</span>
                    <span className="text-white/25"> / {stat.purchased} left</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function MyAddonsSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-surface p-5 space-y-4 animate-pulse">
      <div className="h-3 w-36 bg-white/[0.08] rounded" />
      <div className="space-y-3">
        {[80, 60, 90, 70].map((w, i) => (
          <div key={i} className="h-2 rounded" style={{ width: `${w}%`, background: "rgba(255,255,255,0.05)" }} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MyAddonsCard() {
  const { summary, hasAnyCredits, isLoading } = useAddonCredits();

  // While loading, show skeleton to prevent layout shift
  if (isLoading) return <MyAddonsSkeleton />;

  // No addons purchased yet — render nothing (don't show empty state in billing)
  if (!hasAnyCredits) return null;

  const hasSpeaking = Object.keys(summary.speaking).length > 0;
  const hasWriting  = Object.keys(summary.writing).length  > 0;
  const hasMock     = Object.keys(summary.mock ?? {}).length > 0;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-surface p-5 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white/90">My Practice Packs</h2>
          <p className="text-[10px] text-white/30 mt-0.5">
            Purchased add-on question credits
          </p>
        </div>
      </div>

      <div className="border-t border-white/[0.05]" />

      {/* Skill sections + mock */}
      <div className="space-y-5">
        {hasSpeaking && (
          <SkillSection
            skill="speaking"
            taskMap={summary.speaking}
            labelTable={SPEAKING_TASK_LABELS}
          />
        )}
        {hasWriting && (
          <SkillSection
            skill="writing"
            taskMap={summary.writing}
            labelTable={WRITING_TASK_LABELS}
          />
        )}
        {hasMock && <MockSection mock={summary.mock!} />}
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-white/20 border-t border-white/[0.04] pt-3">
        Credits are consumed when you attempt a new prompt beyond your plan quota.
      </p>
    </div>
  );
}
