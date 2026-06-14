"use client";

// ─────────────────────────────────────────────────────────────────────────────
// EssayAnalysisCard.tsx — Client-side writing analytics (zero network calls)
//
// Writing equivalent of TranscriptAnalysisCard. Four metric cards calibrated
// against CELPIP scoring rubrics so signals tie directly to what examiners
// look for, not generic readability scores:
//
//   1. Length & Pace          — word count + sentence count + avg words/sentence
//   2. Vocabulary Diversity   — TTR + the three most-overused content words
//   3. Sentence Range         — min/median/max sentence length + complex %
//   4. Structure              — task-specific checklist (email salutation/closing
//                               or essay thesis/conclusion/connectors)
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo }   from "react";
import { BarChart2 } from "lucide-react";

interface Props {
  essayText:  string;
  taskNumber: number;   // 1 = email/letter, 2 = survey/opinion essay
}

// ── Analysis ─────────────────────────────────────────────────────────────────

interface Stats {
  wordCount:        number;
  uniqueWords:      number;
  ttr:              number;
  sentences:        number;
  avgWordsPerSent:  number;
  shortestSent:     number;
  medianSent:       number;
  longestSent:      number;
  longSentPct:      number;
  paragraphs:       number;
  // top 3 most-repeated content words (≥ 3 chars, excludes stop-words)
  topRepeated:      Array<{ word: string; count: number }>;
  // task-1 structure
  hasSalutation:    boolean;
  hasClosing:       boolean;
  // task-2 structure
  hasThesis:        boolean;
  hasConclusion:    boolean;
  connectorCount:   number;
}

const _EMPTY_STATS: Stats = {
  wordCount: 0, uniqueWords: 0, ttr: 0,
  sentences: 0, avgWordsPerSent: 0,
  shortestSent: 0, medianSent: 0, longestSent: 0, longSentPct: 0,
  paragraphs: 0,
  topRepeated: [],
  hasSalutation: false, hasClosing: false,
  hasThesis: false, hasConclusion: false, connectorCount: 0,
};

// English stop-word set used to filter "repeated word" noise. Keep small —
// the goal is to surface CONTENT-word repetition that an examiner notices.
const _STOPWORDS = new Set([
  "the","a","an","and","or","but","if","of","to","in","on","at","by","for","with",
  "from","as","is","it","its","this","that","these","those","i","you","we","they",
  "he","she","my","your","our","their","his","her","be","am","are","was","were",
  "been","being","have","has","had","do","does","did","will","would","could",
  "should","can","may","might","must","not","no","so","than","then","there",
  "here","also","very","just","more","most","some","any","all","one","up","out",
  "about","into","over","because","while","when","where","what","which","who",
  "how","like","also",
]);

// Salutation pattern matches the FIRST non-empty line.
const _SALUTATION_RE = /^\s*(dear|hi|hello|hey|greetings|good (morning|afternoon|evening))\b/i;
// Closing pattern checked against the LAST 4 lines.
const _CLOSING_RE = /\b(sincerely|regards|best regards|kind regards|warm regards|yours sincerely|yours truly|truly yours|cheers|thank you|thanks)\b/i;
// Thesis markers (opinion stance) in paragraph 1.
const _THESIS_RE = /\b(I (believe|think|feel|argue)|in my (opinion|view)|it is (evident|clear|essential|important)|I (strongly )?(agree|disagree|support|oppose)|should|must)\b/i;
// Conclusion markers in last paragraph.
const _CONCLUSION_RE = /\b(in conclusion|to (conclude|summari[sz]e|sum up)|overall|in summary|all in all|therefore|ultimately|for these reasons)\b/i;
// Academic discourse connectors that signal coherent argumentation.
const _CONNECTOR_RE = /\b(however|furthermore|moreover|consequently|therefore|in addition|additionally|on the other hand|on the contrary|as a result|for example|for instance|in contrast|nevertheless|nonetheless|specifically|finally|firstly|secondly|thirdly)\b/gi;

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function analyse(text: string): Stats {
  const trimmed = text.trim();
  if (!trimmed) return _EMPTY_STATS;

  const lower = trimmed.toLowerCase();

  // ── Words ────────────────────────────────────────────────────────────────
  const wordTokens = lower.split(/\s+/).filter(Boolean);
  const wordCount  = wordTokens.length;
  // Stripped form for uniqueness + repetition counts.
  const stripped = wordTokens.map(w => w.replace(/[^a-z']/g, "")).filter(Boolean);
  const unique = new Set(stripped);
  const ttr = wordCount > 0 ? unique.size / wordCount : 0;

  // Top repeated content words (≥3 chars, not a stop-word, count ≥3).
  const freq = new Map<string, number>();
  for (const w of stripped) {
    if (w.length < 3 || _STOPWORDS.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const topRepeated = Array.from(freq.entries())
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word, count]) => ({ word, count }));

  // ── Sentences ────────────────────────────────────────────────────────────
  const rawSents = trimmed.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const sentences = rawSents.length;
  const sentLengths = rawSents.map(s => s.split(/\s+/).filter(Boolean).length);
  const longSents = sentLengths.filter(n => n >= 12).length;
  const longSentPct = sentences > 0 ? Math.round((longSents / sentences) * 100) : 0;
  const avgWordsPerSent = sentences > 0 ? Math.round(wordCount / sentences) : 0;
  const shortestSent = sentLengths.length ? Math.min(...sentLengths) : 0;
  const longestSent  = sentLengths.length ? Math.max(...sentLengths) : 0;
  const medianSent   = median(sentLengths);

  // ── Paragraphs — split on ANY newline run, matching the backend preflight.
  // Browsers' contenteditable typically emits single \n between paragraphs,
  // so the older /\n\s*\n/ regex undercounted by treating them as one block.
  const paras = trimmed.split(/(?:\r?\n)+/).map(p => p.trim()).filter(Boolean);
  const paragraphs = Math.max(1, paras.length);

  // ── Structure detectors (task-aware checks live in the signal builders) ──
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0] ?? "";
  const tailBlock = lines.slice(-4).join("\n");
  const hasSalutation = _SALUTATION_RE.test(firstLine);
  const hasClosing    = _CLOSING_RE.test(tailBlock);

  const firstPara = paras[0] ?? "";
  const lastPara  = paras[paras.length - 1] ?? "";
  const hasThesis     = _THESIS_RE.test(firstPara);
  const hasConclusion = _CONCLUSION_RE.test(lastPara);
  const connectorCount = (trimmed.match(_CONNECTOR_RE) ?? []).length;

  return {
    wordCount, uniqueWords: unique.size, ttr,
    sentences, avgWordsPerSent, shortestSent, medianSent, longestSent, longSentPct,
    paragraphs, topRepeated,
    hasSalutation, hasClosing,
    hasThesis, hasConclusion, connectorCount,
  };
}

// ── Signal helpers ───────────────────────────────────────────────────────────

type Signal = { insight: string; textColor: string; barColor: string; statusPct: number };

function lengthSignal(count: number, taskNumber: number): Signal {
  // Task 1 = email/letter: 150–200 words. Task 2 = survey/essay: 150–280 words.
  const lo = 130;
  const hi = taskNumber === 2 ? 300 : 220;
  const statusPct = Math.min(100, Math.round((count / hi) * 100));

  if (count < 80)   return { insight: `Severely short — under 80 words caps your band at 5. Aim for 150–${hi}.`,                                  textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
  if (count < lo)   return { insight: `Too short — ${count} words leaves bullets thinly covered. Aim for 150–${hi}.`,                              textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
  if (count <= hi)  return { insight: `Optimal length — examiners look for completeness inside the 150–${hi}-word budget.`,                        textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  if (count <= hi + 60) return { insight: "Slightly over — cut padding; high bands reward density, not length.",                                  textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct: 100 };
  return                   { insight: "Significantly over target — focus/time-management caps your band at 10.",                                   textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct: 100 };
}

function vocabSignal(ttr: number, topRepeated: Stats["topRepeated"]): Signal {
  const statusPct = Math.round(ttr * 100);

  // Lead with the repetition observation if it's noisy — that's more
  // actionable than a generic TTR bucket.
  if (topRepeated.length && topRepeated[0].count >= 5) {
    const w = topRepeated[0];
    return {
      insight: `"${w.word}" appears ${w.count} times — replace some with synonyms to lift Vocabulary.`,
      textColor: "text-amber-400", barColor: "bg-amber-400", statusPct,
    };
  }

  if (ttr >= 0.62) return { insight: "Wide vocabulary spread — supports Band 9+ on the Vocabulary dimension.",                                     textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  if (ttr >= 0.48) return { insight: "Adequate range — swap one or two common verbs (use, get, make) for precise ones (utilise, obtain, craft).", textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct };
  return                  { insight: "Limited range — frequent repetition typically caps Vocabulary at Band 7.",                                  textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
}

function sentenceSignal(stats: Stats): Signal {
  const { sentences, avgWordsPerSent, shortestSent, longestSent, longSentPct } = stats;
  if (sentences === 0) {
    return { insight: "No sentences detected — check your punctuation.", textColor: "text-rose-400", barColor: "bg-rose-400", statusPct: 0 };
  }

  const statusPct = longSentPct;
  const range = `${shortestSent}–${longestSent} words, avg ${avgWordsPerSent}`;

  if (avgWordsPerSent <= 8) {
    return { insight: `Short, choppy sentences (${range}) — combine ideas with "although", "because", "while".`, textColor: "text-rose-400", barColor: "bg-rose-400", statusPct };
  }
  if (longestSent - shortestSent < 5 && sentences >= 4) {
    return { insight: `Sentence lengths feel uniform (${range}) — vary short and long sentences for natural rhythm.`, textColor: "text-amber-400", barColor: "bg-amber-400", statusPct };
  }
  if (longSentPct >= 50) {
    return { insight: `Strong sentence variety (${range}) — complex structures signal Band 9+ Readability.`, textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  }
  if (longSentPct >= 30) {
    return { insight: `Moderate variety (${range}) — add a subordinate clause or two to lift Readability.`, textColor: "text-amber-400", barColor: "bg-amber-400", statusPct };
  }
  return { insight: `Mostly short sentences (${range}) — embed a relative clause to demonstrate range.`, textColor: "text-rose-400", barColor: "bg-rose-400", statusPct };
}

function structureSignal(stats: Stats, taskNumber: number): Signal {
  const { paragraphs, hasSalutation, hasClosing, hasThesis, hasConclusion, connectorCount, wordCount } = stats;

  if (taskNumber === 1) {
    // Email structural checklist — salutation, closing, paragraph count.
    const missing: string[] = [];
    if (!hasSalutation) missing.push("salutation");
    if (!hasClosing)    missing.push("closing");
    if (paragraphs < 3) missing.push(`paragraph break${paragraphs === 1 ? "s" : ""}`);

    const score = (hasSalutation ? 1 : 0) + (hasClosing ? 1 : 0) + (paragraphs >= 3 ? 1 : 0);
    const statusPct = Math.round((score / 3) * 100);

    if (missing.length === 0) {
      return { insight: `Complete email format — salutation, ${paragraphs} paragraphs, closing all present.`, textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
    }
    if (missing.length === 1) {
      return { insight: `Missing ${missing[0]} — that single gap can cap Task Fulfillment at Band 8.`, textColor: "text-amber-400", barColor: "bg-amber-400", statusPct };
    }
    return { insight: `Missing ${missing.join(" + ")} — format gaps cap Task Fulfillment at Band 7.`, textColor: "text-rose-400", barColor: "bg-rose-400", statusPct };
  }

  // Task 2 — opinion essay: thesis, conclusion, paragraph count, connectors.
  const minConnectors = wordCount >= 150 ? 2 : 1;
  const missing: string[] = [];
  if (!hasThesis)              missing.push("thesis");
  if (!hasConclusion)          missing.push("conclusion");
  if (paragraphs < 3)          missing.push("paragraphs");
  if (connectorCount < minConnectors) missing.push("connectors");

  const score = (hasThesis ? 1 : 0) + (hasConclusion ? 1 : 0) + (paragraphs >= 3 ? 1 : 0) + (connectorCount >= minConnectors ? 1 : 0);
  const statusPct = Math.round((score / 4) * 100);

  if (missing.length === 0) {
    return { insight: `Solid structure — thesis, ${paragraphs} paragraphs, conclusion, ${connectorCount} connectors.`, textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  }
  if (missing.length === 1) {
    return { insight: `Missing ${missing[0]} — opinion essays need all four to reach Band 9+.`, textColor: "text-amber-400", barColor: "bg-amber-400", statusPct };
  }
  return { insight: `Missing ${missing.join(" + ")} — structure gaps cap Content/Coherence at Band 7.`, textColor: "text-rose-400", barColor: "bg-rose-400", statusPct };
}

// ── Shared MetricCard (identical design to TranscriptAnalysisCard) ────────────

function MetricCard({ label, value, unit, detail, signal }: {
  label:   string;
  value:   string;
  unit?:   string;
  detail?: string;
  signal:  Signal;
}) {
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-4 flex flex-col gap-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums text-white/90">{value}</span>
        {unit && <span className="text-xs text-white/30">{unit}</span>}
      </div>
      <div className="h-0.5 w-full rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${signal.barColor}`}
          style={{ width: `${Math.max(2, signal.statusPct)}%` }}
        />
      </div>
      {detail && <p className="text-[11px] text-white/30">{detail}</p>}
      <p className={`text-xs leading-relaxed ${signal.textColor}`}>{signal.insight}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function EssayAnalysisCard({ essayText, taskNumber }: Props) {
  const s = useMemo(() => analyse(essayText ?? ""), [essayText]);
  if (!s.wordCount) return null;

  const lenSig    = lengthSignal(s.wordCount, taskNumber);
  const vocabSig  = vocabSignal(s.ttr, s.topRepeated);
  const sentSig   = sentenceSignal(s);
  const structSig = structureSignal(s, taskNumber);

  const taskLabel = taskNumber === 2 ? "Survey / Essay" : "Email / Letter";

  // Detail strings — surface concrete numbers/words, not generic prose.
  const lengthDetail = `~${s.sentences} sentence${s.sentences !== 1 ? "s" : ""} · ${s.avgWordsPerSent} w/sentence`;

  const vocabDetail = s.topRepeated.length
    ? `Top repeats: ${s.topRepeated.map(t => `${t.word} ×${t.count}`).join(", ")}`
    : `${s.uniqueWords} distinct words`;

  const sentenceDetail = `${s.longSentPct}% are ≥12 words (Band 9 marker)`;

  const structureDetail = taskNumber === 1
    ? `Salutation ${s.hasSalutation ? "✓" : "✗"} · Closing ${s.hasClosing ? "✓" : "✗"} · ${s.paragraphs} paragraph${s.paragraphs !== 1 ? "s" : ""}`
    : `Thesis ${s.hasThesis ? "✓" : "✗"} · Conclusion ${s.hasConclusion ? "✓" : "✗"} · ${s.paragraphs} paragraph${s.paragraphs !== 1 ? "s" : ""} · ${s.connectorCount} connector${s.connectorCount !== 1 ? "s" : ""}`;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-white/40" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/40">Writing Analytics</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/30">
          Task {taskNumber} · {taskLabel}
        </span>
      </div>

      {/* 2×2 metric grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Length & Pace"
          value={`${s.wordCount}`}
          unit="words"
          detail={lengthDetail}
          signal={lenSig}
        />
        <MetricCard
          label="Vocabulary Diversity"
          value={`${Math.round(s.ttr * 100)}%`}
          unit="unique"
          detail={vocabDetail}
          signal={vocabSig}
        />
        <MetricCard
          label="Sentence Range"
          value={s.sentences ? `${s.shortestSent}–${s.longestSent}` : "0"}
          unit="words"
          detail={sentenceDetail}
          signal={sentSig}
        />
        <MetricCard
          label={taskNumber === 1 ? "Email Structure" : "Essay Structure"}
          value={`${s.paragraphs}`}
          unit={s.paragraphs !== 1 ? "paras" : "para"}
          detail={structureDetail}
          signal={structSig}
        />
      </div>

      <p className="text-[10px] leading-relaxed text-white/20 border-t border-white/[0.05] pt-3">
        Metrics are computed from your submitted essay text. Use these as practice signals — actual CELPIP scores reflect human examiner judgment.
      </p>
    </div>
  );
}
