"use client";

import { useState, useTransition } from "react";
import { Target, Pencil, Check, X, Loader2 } from "lucide-react";
import { useAuth }          from "@clerk/nextjs";
import { useQueryClient }   from "@tanstack/react-query";
import { BAND_LABELS }      from "@/lib/constants";
import { useCurrentUser }   from "@/lib/hooks/useCurrentUser";
import { api, authHeaders, API_V1, USE_MOCK } from "@/lib/api";
import type { AppUser }     from "@/lib/types";

// ── Config ────────────────────────────────────────────────────────────────────

const TARGET_BANDS = [6, 7, 8, 9, 10, 11, 12] as const;

const BAND_COLOUR: Record<number, { ring: string; bg: string; text: string }> = {
  6:  { ring: "border-orange-400",  bg: "bg-orange-50  dark:bg-orange-950/40",  text: "text-orange-500"  },
  7:  { ring: "border-amber-400",   bg: "bg-amber-50   dark:bg-amber-950/40",   text: "text-amber-500"   },
  8:  { ring: "border-yellow-400",  bg: "bg-yellow-50  dark:bg-yellow-950/40",  text: "text-yellow-500"  },
  9:  { ring: "border-lime-500",    bg: "bg-lime-50    dark:bg-lime-950/40",    text: "text-lime-600"    },
  10: { ring: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600" },
  11: { ring: "border-sky-500",     bg: "bg-sky-50     dark:bg-sky-950/40",     text: "text-sky-600"     },
  12: { ring: "border-violet-500",  bg: "bg-violet-50  dark:bg-violet-950/40",  text: "text-violet-600"  },
};

const DEFAULT_COLOUR = { ring: "border-border", bg: "bg-muted", text: "text-subtle" };

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Shows the user's target CELPIP band with an inline editor (bands 6–12).
 * On save, PATCHes /api/v1/users/me/target-score and invalidates the
 * React Query "current-user" cache so the whole app reflects the change.
 */
export function TargetBandWidget() {
  const { user, isLoading } = useCurrentUser();
  const { getToken }        = useAuth();
  const queryClient         = useQueryClient();

  const [isEditing, setIsEditing]    = useState(false);
  const [draft, setDraft]            = useState<number>(9);
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentBand = user?.target_band ?? null;
  const label  = currentBand != null ? (BAND_LABELS[currentBand] ?? "") : "";
  const colour = currentBand != null ? (BAND_COLOUR[currentBand] ?? DEFAULT_COLOUR) : DEFAULT_COLOUR;

  const openEditor = () => {
    setDraft(currentBand ?? 9);
    setError(null);
    setIsEditing(true);
  };

  const cancel = () => { setIsEditing(false); setError(null); };

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        if (USE_MOCK) {
          // Mock mode: skip network, just update the cache optimistically
          queryClient.setQueryData<AppUser>(["current-user"], (old) =>
            old ? { ...old, target_band: draft } : old,
          );
        } else {
          const token = await getToken();
          await api.patch<AppUser>(
            `${API_V1}/users/me/target-score`,
            { target_band: draft },
            { headers: authHeaders(token) },
          );
          // Refresh so the cached user reflects the new band everywhere
          await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        }
        setIsEditing(false);
      } catch {
        setError("Failed to save. Please try again.");
      }
    });
  };

  // ── Skeleton while loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface shadow-card p-5 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-16 w-full bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card p-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Target Band</h2>
        </div>

        {!isEditing && (
          <button
            id="target-band-edit-btn"
            onClick={openEditor}
            aria-label="Edit target band"
            title="Set your target band"
            className="p-1.5 rounded-md text-subtle hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Editor ─────────────────────────────────────────────────────────── */}
      {isEditing ? (
        <div className="space-y-3">
          <p className="text-xs text-subtle">Select your target CELPIP band (6–12):</p>

          <div className="flex flex-wrap gap-2">
            {TARGET_BANDS.map((band) => {
              const c = BAND_COLOUR[band] ?? DEFAULT_COLOUR;
              const isSelected = draft === band;
              return (
                <button
                  key={band}
                  id={`target-band-btn-${band}`}
                  onClick={() => setDraft(band)}
                  aria-pressed={isSelected}
                  className={[
                    "w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all duration-150",
                    isSelected
                      ? `${c.ring} ${c.bg} ${c.text} scale-110 shadow-md`
                      : "border-border bg-muted text-subtle hover:border-primary hover:text-foreground",
                  ].join(" ")}
                >
                  {band}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-subtle">
            Band {draft} —{" "}
            <span className="font-medium text-foreground">{BAND_LABELS[draft]}</span>
          </p>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              id="target-band-save-btn"
              onClick={save}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              id="target-band-cancel-btn"
              onClick={cancel}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-subtle hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ── Display ─────────────────────────────────────────────────────── */
        <>
          {currentBand != null ? (
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full border-4 flex items-center justify-center shrink-0 transition-colors ${colour.ring} ${colour.bg}`}
              >
                <span className={`text-2xl font-extrabold leading-none ${colour.text}`}>
                  {currentBand}
                </span>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{label}</p>
                <p className="text-xs text-subtle mt-0.5">CELPIP Band {currentBand} / 12</p>
                <p className="text-[11px] text-subtle mt-1 italic">
                  Sample responses will target this level.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-subtle">No target band set yet.</p>
              <button
                id="target-band-set-btn"
                onClick={openEditor}
                className="text-xs font-medium text-primary hover:underline"
              >
                Set your goal →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
