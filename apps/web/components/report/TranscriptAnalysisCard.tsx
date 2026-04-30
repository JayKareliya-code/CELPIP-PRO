"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TranscriptAnalysisCard.tsx — Client-side speech analytics
//
// 100% client-side — no backend calls. Analyzes the user's transcript text
// to surface concrete, measurable insights that the AI scorer doesn't report:
//
//   1. Filler Words      — per-filler count + total, highlights in the text
//   2. Speaking Pace     — estimated WPM and what that means for CELPIP
//   3. Sentence Variety  — % of sentences that are "short" (< 9 words)
//   4. Vocabulary Richness — Type-Token Ratio (unique words / total words)
//
// Only renders for speaking attempts that have a non-empty transcript.
// The data is computed once on mount — no re-computation on re-renders.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState }     from "react";
import { ChevronDown }            from "lucide-react";

interface Props {
  transcript:    string;
  taskDurationS: number;   // speaking response time in seconds (used for WPM)
}

// ── Filler word dictionary ────────────────────────────────────────────────────

const FILLERS: Record<string, string[]> = {
  "um / uh":   ["um", "uh", "umm", "uhh", "uhm"],
  "like":      ["like"],
  "you know":  ["you know"],
  "kind of":   ["kind of"],
  "sort of":   ["sort of"],
  "basically": ["basically"],
  "literally": ["literally"],
  "I mean":    ["i mean"],
  // NOTE: "right" and "actually" are omitted — they are common legitimate English
  // words ("Turn right", "Actually I studied...") and produce too many false positives
  // without sentence-position context-awareness.
};

// ── Analysis engine ───────────────────────────────────────────────────────────

interface FillerHit { group: string; count: number; }

interface TranscriptStats {
  wordCount:        number;
  uniqueWords:      number;
  ttr:              number;           // unique / total — 0.0–1.0
  sentences:        number;
  shortSentences:   number;           // < 9 words
  shortPct:         number;           // 0–100
  fillers:          FillerHit[];
  totalFillers:     number;
  fillerRate:       number;           // fillers per 100 words
  estimatedWpm:     number;           // wordCount / (taskDurationS / 60)
}

function analyse(text: string, taskDurationS: number): TranscriptStats {
  const lower   = text.toLowerCase();
  const words   = lower.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Type-Token Ratio
  const unique   = new Set(words);
  const ttr      = wordCount > 0 ? unique.size / wordCount : 0;

  // Sentence segmentation (split on . ! ?)
  const rawSentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const sentences    = rawSentences.length;
  const short        = rawSentences.filter((s) => s.split(/\s+/).filter(Boolean).length < 9).length;
  const shortPct     = sentences > 0 ? Math.round((short / sentences) * 100) : 0;

  // Filler word counting — search the full lower-cased text for each pattern
  const fillers: FillerHit[] = [];
  let totalFillers = 0;
  for (const [group, patterns] of Object.entries(FILLERS)) {
    let count = 0;
    for (const pat of patterns) {
      // Word-boundary aware: match the pattern surrounded by spaces/punctuation
      const re = new RegExp(`(?:^|\\s)${pat}(?=\\s|,|\\.|!|\\?|$)`, "gi");
      const matches = lower.match(re);
      count += matches ? matches.length : 0;
    }
    if (count > 0) fillers.push({ group, count });
    totalFillers += count;
  }

  // Sort fillers by count descending
  fillers.sort((a, b) => b.count - a.count);

  const fillerRate    = wordCount > 0 ? +((totalFillers / wordCount) * 100).toFixed(1) : 0;
  const estimatedWpm  = taskDurationS > 0 ? Math.round(wordCount / (taskDurationS / 60)) : 0;

  return {
    wordCount, uniqueWords: unique.size, ttr,
    sentences, shortSentences: short, shortPct,
    fillers, totalFillers, fillerRate,
    estimatedWpm,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function wpmLabel(wpm: number): { text: string; color: string } {
  if (wpm < 100) return { text: "Too slow — aim for 110–140 WPM in CELPIP speaking tasks", color: "text-rose-400" };
  if (wpm < 110) return { text: "Slightly slow — natural pacing helps your fluency score", color: "text-amber-400" };
  if (wpm <= 145) return { text: "Ideal pace — clear and natural for CELPIP examiners", color: "text-emerald-400" };
  if (wpm <= 165) return { text: "Slightly fast — slow down slightly to improve clarity", color: "text-amber-400" };
  return { text: "Too fast — examiners may miss details; aim to slow down", color: "text-rose-400" };
}

function ttrLabel(ttr: number): { text: string; color: string } {
  if (ttr >= 0.65) return { text: "Rich vocabulary — excellent word variety for Band 9+", color: "text-emerald-400" };
  if (ttr >= 0.50) return { text: "Good variety — aim for more synonyms and precise nouns", color: "text-amber-400" };
  return { text: "Repetitive phrasing — practise using synonyms and varied structures", color: "text-rose-400" };
}

function shortSentLabel(pct: number): { text: string; color: string } {
  if (pct <= 30)  return { text: "Good mix — varied sentence length boosts your coherence score", color: "text-emerald-400" };
  if (pct <= 50)  return { text: "Slightly choppy — try joining short ideas with connectors", color: "text-amber-400" };
  return { text: "Many short sentences — signal limited grammatical range to examiners", color: "text-rose-400" };
}

// ── Stat Row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, sublabel, valueColor = "text-white/90" }: {
  label:      string;
  value:      string;
  sublabel:   string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</p>
        <p className="text-[11px] leading-snug text-white/35 mt-0.5">{sublabel}</p>
      </div>
      <span className={`flex-shrink-0 text-sm font-bold tabular-nums ${valueColor}`}>{value}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TranscriptAnalysisCard({ transcript, taskDurationS }: Props) {
  const [open, setOpen] = useState(false);

  // useMemo must be called unconditionally (Rules of Hooks).
  // analyse() handles the empty-string case by returning zero counts,
  // so we gate rendering on stats.wordCount below instead of a pre-hook return.
  const stats = useMemo(
    () => analyse(transcript ?? "", taskDurationS),
    [transcript, taskDurationS],
  );

  // Nothing to show for empty transcripts
  if (!stats.wordCount) return null;

  const wpm    = wpmLabel(stats.estimatedWpm);
  const ttr    = ttrLabel(stats.ttr);
  const sShort = shortSentLabel(stats.shortPct);

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="text-sm font-semibold uppercase tracking-wider text-white/40">
            Speech Analytics
          </span>
          {stats.totalFillers > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
              {stats.totalFillers} filler{stats.totalFillers !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expandable body */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-5 py-4 flex flex-col gap-5">

            {/* ── Metric grid ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <StatRow
                label="Words"
                value={String(stats.wordCount)}
                sublabel={`${stats.uniqueWords} unique`}
              />
              <StatRow
                label="Est. pace"
                value={`${stats.estimatedWpm} wpm`}
                sublabel={wpm.text}
                valueColor={wpm.color}
              />
              <StatRow
                label="Vocab richness"
                value={`${Math.round(stats.ttr * 100)}%`}
                sublabel={ttr.text}
                valueColor={ttr.color}
              />
              <StatRow
                label="Short sentences"
                value={`${stats.shortPct}%`}
                sublabel={sShort.text}
                valueColor={sShort.color}
              />
            </div>

            {/* ── Filler words breakdown ───────────────────────────────────── */}
            {stats.fillers.length > 0 ? (
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400/70">
                    Filler words detected
                  </p>
                  <span className="text-xs text-white/30 tabular-nums">
                    {stats.fillerRate}/100 words
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.fillers.map(({ group, count }) => (
                    <span
                      key={group}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs"
                    >
                      <span className="text-white/60">&ldquo;{group}&rdquo;</span>
                      <span className="font-bold tabular-nums text-amber-400">×{count}</span>
                    </span>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-white/40">
                  {stats.fillerRate > 5
                    ? "High filler rate hurts your Fluency & Pronunciation score. Practise pausing silently instead of filling gaps."
                    : stats.fillerRate > 2
                    ? "Moderate filler use. Record yourself speaking and replay — silence is better than fillers."
                    : "Low filler rate — good control. Keep practising to eliminate the remaining fillers."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3">
                <p className="text-xs text-emerald-300/70">
                  ✓ No filler words detected — excellent fluency control.
                </p>
              </div>
            )}

            {/* ── Practice tip ────────────────────────────────────────────── */}
            <p className="text-[11px] leading-relaxed text-white/25 border-t border-white/[0.05] pt-3">
              These metrics are estimated from your transcript text.
              Actual CELPIP scores use human examiner judgment — treat these as practice signals, not guarantees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
