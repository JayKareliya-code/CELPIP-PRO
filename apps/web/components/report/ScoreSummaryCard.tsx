"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ScoreSummaryCard.tsx — Overall band score with SVG arc gauge
//
// P1 upgrade:
//   • next_milestone — amber coaching pill shown below the band label
//   • wordCount / estimatedTime — compact stats row from the transcript
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useState } from "react";
import { Mic, PenLine, Clock, Target }  from "lucide-react";
import { formatBand, roundBand }        from "@/lib/utils";
import type { Skill }                   from "@/lib/types";

interface Props {
  estimatedBand:  number;
  skill:          Skill;
  completedAt:    string;
  nextMilestone?: string;      // AI coaching note: "Do X to reach Band N+0.5"
  wordCount?:     number;      // Transcript word count (speaking)
}

/** Returns Tailwind colour classes keyed by band range */
function bandPalette(band: number): { text: string; stroke: string; bg: string; badge: string } {
  if (band >= 9)  return { text: "text-emerald-400", stroke: "#34D399", bg: "bg-emerald-400/10", badge: "bg-emerald-400/20 text-emerald-300 border-emerald-500/30" };
  if (band >= 6)  return { text: "text-amber-400",   stroke: "#FBBF24", bg: "bg-amber-400/10",   badge: "bg-amber-400/20   text-amber-300   border-amber-500/30"   };
  return           { text: "text-rose-400",    stroke: "#F87171", bg: "bg-rose-400/10",    badge: "bg-rose-400/20    text-rose-300    border-rose-500/30"    };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Estimate speaking time in seconds at ~130 WPM */
function estimatedSeconds(words: number): string {
  const secs = Math.round((words / 130) * 60);
  if (secs < 60) return `~${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `~${m}m ${s}s` : `~${m}m`;
}

export function ScoreSummaryCard({ estimatedBand, skill, completedAt, nextMilestone, wordCount }: Props) {
  const palette = bandPalette(estimatedBand);
  const [animated, setAnimated] = useState(0);

  // Round to nearest 0.5 once — used for gauge target and all labels
  const displayBand = roundBand(estimatedBand);

  // Animate the arc from 0 → displayBand on mount.
  // Pure rAF cubic ease-out — no CSS transition on the SVG element
  // (CSS transition + rAF fighting each other causes jitter/stutter).
  // Phase 1 — reset arc to 0 BEFORE the browser paints.
  // useLayoutEffect fires synchronously after DOM mutations but before paint,
  // so the arc is guaranteed to be invisible on the very first frame.
  useLayoutEffect(() => {
    setAnimated(0);
  }, [displayBand]);

  // Phase 2 — drive the rAF animation after the 0-state has been painted.
  // Keeping this in useEffect (post-paint) means the rAF loop starts only
  // after the browser has committed the reset render to screen.
  useEffect(() => {
    let rafId: number;
    const start    = performance.now();
    const duration = 1200;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimated(eased * displayBand);
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [displayBand]);

  // SVG arc gauge
  const radius      = 60;
  const circumference = 2 * Math.PI * radius;

  const hasWords     = typeof wordCount === "number" && wordCount > 0;
  const hasMilestone = typeof nextMilestone === "string" && nextMilestone.trim().length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-panel">
      {/* Ambient glow — primary top-right */}
      <div className={`absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl opacity-25 ${palette.bg}`} />
      {/* Secondary glow near gauge */}
      <div className={`absolute -bottom-12 -left-12 h-40 w-40 rounded-full blur-3xl opacity-15 ${palette.bg}`} />

      <div className="relative flex flex-row items-center gap-8">
        {/* SVG Arc Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="180" height="180" viewBox="0 0 152 152" className="-rotate-[135deg]">
            {/* Track */}
            <circle
              cx="76" cy="76" r={radius}
              fill="none" stroke="#252836" strokeWidth="10"
              strokeDasharray={circumference * 0.75}
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            {/* Progress */}
            <circle
              cx="76" cy="76" r={radius}
              fill="none" stroke={palette.stroke} strokeWidth="10"
              strokeDasharray={circumference * 0.75}
              strokeDashoffset={circumference * 0.75 * (1 - animated / 12)}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${palette.stroke}80)` }}
            />
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold tabular-nums ${palette.text}`}>
              {formatBand(animated)}
            </span>
            <span className="text-xs text-subtle uppercase tracking-widest mt-0.5">/ 12</span>
          </div>
        </div>

        {/* Text info — always left-aligned */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${palette.badge}`}>
            {skill === "speaking"
              ? <Mic className="h-3 w-3" />
              : <PenLine className="h-3 w-3" />}
            {skill.charAt(0).toUpperCase() + skill.slice(1)}
          </div>
          <p className="text-sm text-white/50">Completed {formatDate(completedAt)}</p>

          {/* Band label */}
          {/* Band label — neutral background, no distracting fill */}
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-4 w-0.5 rounded-full flex-shrink-0 ${palette.bg.replace("/10", "/60")}`} />
            <span className={`text-sm font-semibold tabular-nums ${palette.text}`}>
              {displayBand >= 9
                ? "Excellent — Band " + formatBand(displayBand)
                : displayBand >= 6
                ? "Competent — Band " + formatBand(displayBand)
                : "Developing — Band " + formatBand(displayBand)}
            </span>
          </div>

          {/* Word count + estimated time (speaking only) */}
          {hasWords && (
            <div className="flex items-center gap-3 pt-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] text-white/35">
                {wordCount} words
              </span>
              <span className="text-white/15">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-white/35">
                <Clock className="h-3 w-3 text-white/20" />
                {estimatedSeconds(wordCount!)} est.
              </span>
            </div>
          )}

          {/* Next milestone coaching pill */}
          {hasMilestone && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 mt-1">
              <Target className="flex-shrink-0 h-4 w-4 text-amber-400 mt-0.5" />
              <p className="text-xs leading-relaxed text-amber-200/85">{nextMilestone}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
