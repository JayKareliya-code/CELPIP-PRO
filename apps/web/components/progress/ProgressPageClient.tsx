"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ProgressPageClient.tsx — Client orchestrator for /progress
//
// Responsibilities:
//   1. Read plan from useCurrentUser — gate Starter with upgrade prompt
//   2. Manage active skill tab (Speaking / Writing)
//   3. Call useProgressData(skill) — one aggregated fetch, limit=30
//   4. Render section layout: stats → task grid → weak areas → recent feed
// ─────────────────────────────────────────────────────────────────────────────

import { useState }             from "react";
import Link                     from "next/link";
import { Mic, PenLine, Sparkles, TrendingUp } from "lucide-react";
import { cn }                   from "@/lib/utils";
import { useCurrentUser }       from "@/lib/hooks/useCurrentUser";
import { useProgressData }      from "@/lib/hooks/useProgressData";
import { ProgressOverviewStats } from "@/components/progress/ProgressOverviewStats";
import { TaskScoreGrid }        from "@/components/progress/TaskScoreGrid";

import { RecentAttemptsFeed }   from "@/components/progress/RecentAttemptsFeed";
import type { Skill } from "@/lib/types";

// ── Skill tab button ───────────────────────────────────────────────────────────

interface SkillTabProps {
  skill:    Skill;
  active:   Skill;
  onSelect: (s: Skill) => void;
}

function SkillTab({ skill, active, onSelect }: SkillTabProps) {
  const isActive = skill === active;
  const Icon     = skill === "speaking" ? Mic : PenLine;
  const label    = skill === "speaking" ? "Speaking" : "Writing";
  const count    = skill === "speaking" ? "8 tasks" : "2 tasks";

  return (
    <button
      type="button"
      onClick={() => onSelect(skill)}
      aria-pressed={isActive}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-200",
        isActive
          ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
          : "border-border bg-surface text-subtle hover:border-primary/30 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
      <span>{label}</span>
      <span className={cn(
        "text-[10px] font-normal",
        isActive ? "text-primary/70" : "text-subtle/60",
      )}>
        {count}
      </span>
    </button>
  );
}

// ── Starter gate ──────────────────────────────────────────────────────────────

function StarterGate() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-border/60 bg-surface/40 py-20 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
        <TrendingUp className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-bold text-foreground">Track Your Progress</h2>
        <p className="text-sm text-subtle">
          Upgrade to Pro or Ultra to access per-task score tracking, trend charts, and
          personalised improvement insights across all 8 Speaking and 2 Writing tasks.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade to Pro
        </Link>
        <Link
          href="/speaking"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:border-primary/40 transition-colors"
        >
          <Mic className="h-4 w-4" />
          Practice Speaking
        </Link>
      </div>
      <p className="text-xs text-subtle/60">
        Starter plan includes 1 full mock test per skill.{" "}
        <Link href="/billing" className="text-primary hover:underline">Compare plans →</Link>
      </p>
    </div>
  );
}

// ── Skill section (loaded content) ───────────────────────────────────────────

function SkillSection({ skill }: { skill: Skill }) {
  const { taskStats, overviewStats, recentItems, isLoading, isError } = useProgressData(skill);

  if (isError) {
    return (
      <p className="py-10 text-center text-sm text-subtle">
        Could not load progress data.{" "}
        <button onClick={() => window.location.reload()} className="text-primary hover:underline">
          Retry
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1 — Overview stats strip */}
      <ProgressOverviewStats
        stats={overviewStats}
        isLoading={isLoading}
        skill={skill}
      />

      {/* 2 — Per-task score cards */}
      <TaskScoreGrid
        skill={skill}
        taskStats={taskStats}
        isLoading={isLoading}
      />

      {/* 3 — Recent attempts feed */}
      <RecentAttemptsFeed
        items={recentItems}
        skill={skill}
        isLoading={isLoading}
      />
    </div>
  );
}

// ── Page client root ──────────────────────────────────────────────────────────

export function ProgressPageClient() {
  const [activeSkill, setActiveSkill] = useState<Skill>("speaking");
  const { user, isLoading: userLoading } = useCurrentUser();

  // ── Page header ───────────────────────────────────────────────────────────

  const header = (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Progress
          </h1>
          <p className="mt-1 text-sm text-subtle">
            Track your improvement across all practice tasks
          </p>
        </div>

        {/* Skill tabs — only shown for Pro/Ultra */}
        {!userLoading && user?.plan !== "starter" && (
          <div className="flex gap-2">
            <SkillTab skill="speaking" active={activeSkill} onSelect={setActiveSkill} />
            <SkillTab skill="writing"  active={activeSkill} onSelect={setActiveSkill} />
          </div>
        )}
      </div>
    </div>
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (userLoading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Starter gate ──────────────────────────────────────────────────────────
  if (user?.plan === "starter") {
    return (
      <div className="space-y-6">
        {header}
        <StarterGate />
      </div>
    );
  }

  // ── Pro / Ultra: full page ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {header}
      <SkillSection key={activeSkill} skill={activeSkill} />
    </div>
  );
}
