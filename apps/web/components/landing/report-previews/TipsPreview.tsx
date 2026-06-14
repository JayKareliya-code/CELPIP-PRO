// ─────────────────────────────────────────────────────────────────────────────
// TipsPreview — static replica of components/report/ImprovementTipsAccordion.tsx.
// Numbered coaching drills; the first row is shown expanded with WHY / HOW.
// Sample data only — illustrative.
// ─────────────────────────────────────────────────────────────────────────────
import { Wrench, HelpCircle, Zap, ChevronDown } from "lucide-react";

export function TipsPreview() {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
      {/* header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-primary/75" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">Improvement Tips</span>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/50">
          3
        </span>
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-4">
        {/* tip 1 — expanded */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-white/[0.015] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary/45 before:content-['']">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-[11px] font-bold tabular-nums text-white/55">
              1
            </span>
            <span className="flex-1 text-[15px] font-semibold text-white/90">
              Vary your vocabulary
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[10px] uppercase tracking-wider text-white/35">High</span>
            </span>
            <ChevronDown className="h-4 w-4 rotate-180 text-white/30" />
          </div>
          <div className="flex flex-col gap-2.5 px-4 pb-4">
            <div className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-white/30" />
              <p className="text-sm leading-relaxed text-white/65">
                Repeating common words caps your Vocabulary score even when your ideas are strong.
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-primary/[0.04] px-3 py-2.5">
              <Zap className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary/80" />
              <p className="text-[14px] leading-relaxed text-white/85">
                Before recording, list three precise synonyms for the key idea and use them.
              </p>
            </div>
          </div>
        </div>

        {/* tip 2 — collapsed */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-white/[0.015] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary/20 before:content-['']">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-[11px] font-bold tabular-nums text-white/55">
              2
            </span>
            <span className="flex-1 text-[15px] font-semibold text-white/90">
              Add a concrete example
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/55" />
              <span className="text-[10px] uppercase tracking-wider text-white/35">Medium</span>
            </span>
            <ChevronDown className="h-4 w-4 text-white/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
