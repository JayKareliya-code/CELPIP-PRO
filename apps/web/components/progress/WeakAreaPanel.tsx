"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WeakAreaPanel.tsx — Ultra-only panel showing rubric dimension breakdown
//
// Shows a colour-coded horizontal bar per dimension with avg score + attempt count.
// Locked with an upgrade CTA for non-Ultra users.
// Silently hidden if loading or no data.
// ─────────────────────────────────────────────────────────────────────────────

import Link                from "next/link";
import { Lock, Sparkles }  from "lucide-react";
import { useCurrentUser }  from "@/lib/hooks/useCurrentUser";
import { useWeakAreas }    from "@/lib/hooks/useWeakAreas";
import { cn, formatBand }  from "@/lib/utils";

// ── Colour mapping for dimension scores ───────────────────────────────────────

function getDimensionBarColor(avg: number): string {
  if (avg >= 9) return "bg-success";
  if (avg >= 7) return "bg-success/60";
  if (avg >= 5) return "bg-warning";
  return "bg-danger";
}

function getDimensionTextColor(avg: number): string {
  if (avg >= 9) return "text-success";
  if (avg >= 7) return "text-success/80";
  if (avg >= 5) return "text-warning";
  return "text-danger";
}

// ── Dimension bar row ─────────────────────────────────────────────────────────

interface DimensionBarProps {
  label:         string;
  avg_score:     number;
  attempt_count: number;
}

function DimensionBar({ label, avg_score, attempt_count }: DimensionBarProps) {
  const pct = Math.round((avg_score / 12) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-foreground/80">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-subtle">{attempt_count} attempt{attempt_count !== 1 ? "s" : ""}</span>
          <span className={cn("text-sm font-bold tabular-nums", getDimensionTextColor(avg_score))}>
            {formatBand(avg_score)}
            <span className="text-xs font-normal text-subtle">/12</span>
          </span>
        </div>
      </div>
      {/* Bar track */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-all duration-700", getDimensionBarColor(avg_score))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Locked state ─────────────────────────────────────────────────────────────

function LockedState() {
  return (
    <div className="relative rounded-xl border border-border bg-surface p-5 overflow-hidden">
      {/* Blurred preview rows */}
      <div className="space-y-4 blur-sm pointer-events-none select-none" aria-hidden>
        {["Fluency & Pronunciation", "Vocabulary Range", "Grammatical Accuracy", "Coherence & Cohesion", "Task Completion"].map((label) => (
          <div key={label} className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-sm text-foreground/60">{label}</span>
              <span className="text-sm font-bold text-warning">7.5/12</span>
            </div>
            <div className="h-2 w-full rounded-full bg-border overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-warning/40" />
            </div>
          </div>
        ))}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/80 backdrop-blur-sm rounded-xl">
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
          <Lock className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Ultra Plan</span>
        </div>
        <p className="text-sm font-semibold text-foreground text-center px-6">
          Dimension breakdown is an Ultra feature
        </p>
        <p className="text-xs text-subtle text-center px-8">
          See exactly where each of your 5 rubric dimensions stands — and what to fix first.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Upgrade to Ultra
        </Link>
      </div>
    </div>
  );
}

// ── Loaded state ──────────────────────────────────────────────────────────────

function WeakAreaContent() {
  const { items, isLoading } = useWeakAreas();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <div className="h-4 w-40 rounded bg-border" />
              <div className="h-4 w-12 rounded bg-border" />
            </div>
            <div className="h-2 w-full rounded-full bg-border" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-subtle">
        No dimension data yet — complete a few scored attempts to see your breakdown.
      </p>
    );
  }

  // Sort by avg_score ascending (weakest first)
  const sorted = [...items].sort((a, b) => a.avg_score - b.avg_score);

  return (
    <div className="space-y-4">
      {sorted.map((area) => (
        <DimensionBar
          key={area.dimension}
          label={area.label}
          avg_score={area.avg_score}
          attempt_count={area.attempt_count}
        />
      ))}
      <p className="text-[11px] text-subtle pt-1">
        Sorted by weakest dimension first. Focus your practice on the lowest bars.
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function WeakAreaPanel() {
  const { user, isLoading: userLoading } = useCurrentUser();

  if (userLoading) return null;

  const isUltra = user?.plan === "ultra";

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-subtle">
            Rubric Dimension Breakdown
          </h2>
          <p className="text-xs text-subtle/70 mt-0.5">
            Your average score per CELPIP rubric criterion, across all recent attempts
          </p>
        </div>
        {!isUltra && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Lock className="h-2.5 w-2.5" />
            Ultra only
          </span>
        )}
      </div>

      {isUltra ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <WeakAreaContent />
        </div>
      ) : (
        <LockedState />
      )}
    </section>
  );
}
