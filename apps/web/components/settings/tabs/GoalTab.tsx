"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/settings/tabs/GoalTab.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Check, Loader2 }      from "lucide-react";

import { useCurrentUser }   from "@/lib/hooks/useCurrentUser";
import { useSetTargetBand } from "@/lib/hooks/useAccount";
import { BAND_LABELS }      from "@/lib/constants";
import { cn }               from "@/lib/utils";
import { Section }          from "@/components/settings/shared/Section";

/** Band options shown in the selection grid (mirrors onboarding modal). */
const BAND_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function GoalTab() {
  const { user }        = useCurrentUser();
  const setTargetBand   = useSetTargetBand();

  const [selected, setSelected] = useState<number | null>(null);
  const [saved,    setSaved]    = useState(false);

  // Pre-fill with the user's current value once loaded
  useEffect(() => {
    if (user?.target_band != null) setSelected(user.target_band);
  }, [user?.target_band]);

  const bandLabel = selected ? BAND_LABELS[selected] : null;
  const changed   = selected !== (user?.target_band ?? null);

  async function handleSave() {
    if (selected === null) return;
    try {
      await setTargetBand.mutateAsync({ target_band: selected });
      setSaved(true);
      setTimeout(() => setSaved(false), 2_500);
    } catch {
      // Error surfaced via setTargetBand.isError
    }
  }

  return (
    <div className="space-y-4">
      <Section
        title="Target Band Score"
        description="Your target personalises AI feedback, sample responses, and coaching tips throughout the app."
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-white/35">
          Select your goal
        </p>

        {/* ── Band grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
          {BAND_OPTIONS.map((band) => {
            const isSelected = selected === band;
            return (
              <button
                key={band}
                id={`band-option-${band}`}
                type="button"
                onClick={() => setSelected(band)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-center justify-center rounded-xl border py-3 text-sm font-bold transition-all duration-150",
                  isSelected
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30"
                    : "border-white/[0.08] bg-white/[0.02] text-white/40 hover:border-amber-500/30 hover:text-white/80",
                )}
              >
                {band}
              </button>
            );
          })}
        </div>

        {/* ── Selection label ───────────────────────────────────────────── */}
        <div
          className={cn(
            "h-7 flex items-center transition-opacity duration-200",
            selected ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <span className="text-sm text-white/50">
            Band <span className="font-semibold text-white/80">{selected}</span>
            {bandLabel && (
              <> — <span className="text-amber-400/80">{bandLabel}</span></>
            )}
          </span>
        </div>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {setTargetBand.isError && (
          <p className="text-sm text-red-400">Failed to save. Please try again.</p>
        )}

        {/* ── Save button ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            id="btn-save-target-band"
            type="button"
            onClick={handleSave}
            disabled={!changed || selected === null || setTargetBand.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-semibold text-black transition-colors"
          >
            {setTargetBand.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : saved ? (
              <><Check className="h-4 w-4" /> Saved!</>
            ) : (
              "Save goal"
            )}
          </button>
          {!changed && user?.target_band && (
            <span className="text-xs text-white/30">No changes</span>
          )}
        </div>
      </Section>

      {/* ── Info callout ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] px-4 py-3">
        <p className="text-xs text-amber-400/70 leading-relaxed">
          <span className="font-semibold text-amber-400">How it works: </span>
          The AI scorer uses your target band to tailor feedback, highlight gaps, and
          generate sample responses at your goal level. You can update it any time.
        </p>
      </div>
    </div>
  );
}
