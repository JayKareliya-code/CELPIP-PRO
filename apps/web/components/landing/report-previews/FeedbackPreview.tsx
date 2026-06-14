// ─────────────────────────────────────────────────────────────────────────────
// FeedbackPreview — static replica of components/report/FeedbackPanels.tsx
// (the Strengths / Areas-to-Improve toggle). Sample data only — illustrative.
// The toggle pill is non-interactive here; it mirrors the real report's look.
// ─────────────────────────────────────────────────────────────────────────────
import { Check, AlertTriangle, Wrench } from "lucide-react";

export function FeedbackPreview() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-panel">
      {/* toggle pill (static) */}
      <div className="flex items-center gap-1 self-start rounded-xl border border-border/60 bg-white/[0.02] p-1">
        <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-white/90 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400/80" />
          Areas to Improve
          <span className="rounded-full bg-white/10 px-1.5 py-px text-[10px] font-bold tabular-nums text-white/75">2</span>
        </span>
        <span className="flex items-center gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-semibold text-white/45">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/30" />
          Strengths
          <span className="rounded-full bg-white/[0.05] px-1.5 py-px text-[10px] font-bold tabular-nums text-white/35">3</span>
        </span>
      </div>

      {/* weakness card */}
      <div className="relative flex flex-col gap-2.5 rounded-xl border border-border bg-white/[0.015] p-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:rounded-l-xl before:bg-rose-500/40 before:content-['']">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">
          <AlertTriangle className="h-3 w-3 flex-shrink-0 text-rose-400/80" />
          Vocabulary
        </div>
        <p className="text-sm leading-relaxed text-white/80">
          You leaned on a few high-frequency words where a stronger synonym would lift your band.
        </p>
        <p className="border-l border-white/10 pl-3 text-[15px] font-medium italic leading-relaxed text-white/55">
          &ldquo;It was a good idea and a good plan…&rdquo;
        </p>
        <div className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <Wrench className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
          <p className="text-xs leading-relaxed text-white/70">
            Swap repeated words for precise alternatives — e.g. &ldquo;a practical plan,&rdquo; &ldquo;a sensible idea.&rdquo;
          </p>
        </div>
      </div>

      {/* strength card */}
      <div className="relative flex flex-col gap-2 rounded-xl border border-border bg-white/[0.015] p-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:rounded-l-xl before:bg-emerald-500/40 before:content-['']">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">
          <Check className="h-3 w-3 flex-shrink-0 text-emerald-500/80" />
          Coherence
        </div>
        <p className="text-sm leading-relaxed text-white/80">
          Clear beginning, middle and end — your answer was easy to follow throughout.
        </p>
      </div>
    </div>
  );
}
