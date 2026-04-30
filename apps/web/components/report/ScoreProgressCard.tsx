"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ScoreProgressCard.tsx — Score trend vs previous attempt on same task
//
// Displays:
//   • Delta badge: "+1.0 ↑" or "-0.5 ↓" vs the most recent previous attempt
//   • SVG sparkline trend line of last N band scores
//   • Contextual coaching message (improving / dropping / steady)
//
// Only renders when there are ≥ 2 historical scores (including current attempt).
// Shows a skeleton while loading; renders nothing if only 1 attempt or on error.
// ─────────────────────────────────────────────────────────────────────────────

import { useId }                     from "react";
import { useTaskScoreHistory }       from "@/lib/hooks/useTaskScoreHistory";
import { formatBand, roundBand }     from "@/lib/utils";
import type { Skill }                from "@/lib/types";

interface Props {
  currentBand:  number;
  skill:        Skill;
  taskNumber:   number;
  currentAttemptId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deltaLabel(delta: number): string {
  const sign   = delta > 0 ? "+" : "";
  return `${sign}${formatBand(delta)}`;
}

function deltaPalette(delta: number): {
  text: string; bg: string; border: string; arrow: string;
} {
  if (delta > 0)  return { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/30", arrow: "↑" };
  if (delta < 0)  return { text: "text-rose-400",    bg: "bg-rose-400/10",    border: "border-rose-500/30",    arrow: "↓" };
  return               { text: "text-white/40",    bg: "bg-white/[0.05]",  border: "border-white/10",       arrow: "→" };
}

function coachingMessage(delta: number, streak: number): string {
  if (delta > 1)   return `Great leap! You've improved by ${formatBand(delta)} bands since last time.`;
  if (delta > 0)   return streak >= 2
    ? `${streak} attempts in a row improving — keep the momentum!`
    : `Good progress — up ${formatBand(delta)} from your last attempt.`;
  if (delta < -0.5) return "Score dipped this time. Review your weaknesses above and try again.";
  if (delta < 0)   return "Slight dip — consistency matters more than perfection. Keep going.";
  return "Same score as last time. Focus on one weakness to push higher.";
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  // useId produces a stable unique string per component instance,
  // preventing SVG gradient ID collisions across multiple renders.
  const uid = useId();
  const gradientId = `spark-fill-${uid.replace(/:/g, "")}`;

  if (values.length < 2) return null;

  const W = 160;
  const H = 36;
  const min = Math.max(0, Math.min(...values) - 1);
  const max = Math.min(12, Math.max(...values) + 1);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return [x, y] as [number, number];
  });

  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const cpx = (px + cx) / 2;
    d += ` C ${cpx},${py} ${cpx},${cy} ${cx},${cy}`;
  }

  const last = pts[pts.length - 1];
  const isUp = values[values.length - 1] >= values[values.length - 2];
  const color = isUp ? "#34D399" : "#F87171";

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${last[0]},${H} L ${pts[0][0]},${H} Z`} fill={`url(#${gradientId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ScoreProgressCard({ currentBand, skill, taskNumber, currentAttemptId }: Props) {
  const { data, isLoading } = useTaskScoreHistory(skill, taskNumber);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 animate-pulse">
        <div className="h-4 w-28 rounded bg-white/[0.06] mb-3" />
        <div className="h-9 w-20 rounded bg-white/[0.04]" />
      </div>
    );
  }

  // Need ≥ 2 scores in total to show anything useful
  if (!data || data.scores.length < 2) return null;

  // All bands (oldest→newest) — used for the sparkline including the current attempt
  const allBands = data.scores.map((s) => roundBand(s.estimated_band));

  // Previous scores = everything except the current attempt.
  // If the current attempt hasn't propagated to the history cache yet
  // (staleTime window), otherScores equals all scores — delta is still valid.
  const prevScores = data.scores.filter((s) => s.attempt_id !== currentAttemptId);
  if (!prevScores.length) return null;

  const previousBand = roundBand(prevScores[prevScores.length - 1].estimated_band);
  const current      = roundBand(currentBand);
  const delta        = +(current - previousBand).toFixed(1);

  // Streak: count consecutive non-decreasing scores in prevScores (excludes current)
  // so we don't inflate the streak by counting the current attempt against itself.
  const prevBands = prevScores.map((s) => roundBand(s.estimated_band));
  let streak = 0;
  for (let i = prevBands.length - 1; i > 0; i--) {
    if (prevBands[i] >= prevBands[i - 1]) streak++;
    else break;
  }
  // Count the current attempt into the streak if it also improved
  if (delta >= 0) streak++;

  const palette = deltaPalette(delta);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">
          Your Progress
        </h3>
        <Sparkline values={allBands} />
      </div>

      {/* Delta + bands row */}
      <div className="flex items-end gap-3">
        {/* Delta badge */}
        <div className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 ${palette.bg} ${palette.border}`}>
          <span className={`text-2xl font-bold tabular-nums ${palette.text}`}>
            {deltaLabel(delta)}
          </span>
          <span className={`text-lg font-bold ${palette.text}`}>{palette.arrow}</span>
        </div>

        {/* Previous → current */}
        <div className="text-xs text-white/35 leading-snug">
          <span className="tabular-nums">{formatBand(previousBand)}</span>
          <span className="mx-1 text-white/20">→</span>
          <span className={`font-medium tabular-nums ${palette.text}`}>{formatBand(current)}</span>
          <br />
          <span>vs last attempt</span>
        </div>
      </div>

      {/* Coaching message */}
      <p className="text-xs leading-relaxed text-white/45">
        {coachingMessage(delta, streak)}
      </p>

      {/* Attempt count */}
      <p className="text-[10px] text-white/20 tabular-nums">
        Based on {data.scores.length} attempt{data.scores.length !== 1 ? "s" : ""} on this task
      </p>
    </div>
  );
}
