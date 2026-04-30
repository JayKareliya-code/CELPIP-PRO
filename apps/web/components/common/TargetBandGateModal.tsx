"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TargetBandGateModal.tsx — Required onboarding step: collect target band score
// ─────────────────────────────────────────────────────────────────────────────

import { useState }         from "react";
import { Loader2 }          from "lucide-react";
import { useSetTargetBand } from "@/lib/hooks/useAccount";
import { cn }               from "@/lib/utils";

const BAND_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function TargetBandGateModal() {
  const [selected, setSelected] = useState<number | null>(null);
  const setTargetBand = useSetTargetBand();

  async function handleSubmit() {
    if (selected === null) return;
    try {
      await setTargetBand.mutateAsync({ target_band: selected });
    } catch {
      // Error shown via setTargetBand.isError
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-labelledby="band-gate-title"
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-8">

        {/* Header */}
        <div className="mb-6">
          <h2
            id="band-gate-title"
            className="text-xl font-bold text-foreground"
          >
            One quick step
          </h2>
          <p className="mt-1.5 text-sm text-subtle leading-relaxed">
            What&rsquo;s your CELPIP target band? This personalizes your AI
            feedback and sample responses. You can update it anytime in settings.
          </p>
        </div>

        {/* Divider */}
        <div className="mb-5 border-t border-border" />

        {/* Band selector */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">
          Select target band
        </p>
        <div className="mb-6 grid grid-cols-5 gap-2">
          {BAND_OPTIONS.map((band) => {
            const isSelected = selected === band;
            return (
              <button
                key={band}
                type="button"
                onClick={() => setSelected(band)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-center justify-center rounded-xl border py-3 text-sm font-bold transition-all duration-150",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "border-border bg-surface text-subtle hover:border-primary/40 hover:text-foreground",
                )}
              >
                {band}
              </button>
            );
          })}
        </div>

        {/* Selected band label */}
        <div className={cn(
          "mb-5 h-8 flex items-center justify-center transition-opacity duration-200",
          selected !== null ? "opacity-100" : "opacity-0 pointer-events-none",
        )}>
          <span className="text-xs text-subtle">
            Band <span className="font-semibold text-foreground">{selected}</span> selected
            {" "}— feedback will target this goal
          </span>
        </div>

        {/* Error */}
        {setTargetBand.isError && (
          <p className="mb-4 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-subtle text-center">
            Something went wrong. Please try again.
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          id="target-band-submit"
          onClick={handleSubmit}
          disabled={selected === null || setTargetBand.isPending}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {setTargetBand.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );
}
