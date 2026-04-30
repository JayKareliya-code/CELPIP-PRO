"use client";

// ─────────────────────────────────────────────────────────────────────────────
// DashboardStatusRow.tsx — Three-column stat strip: Speaking | Writing | Target
//
// Intentionally stateless/display-only. All async logic lives in:
//   - useDashboardStats (history-derived bands)
//   - useCurrentUser    (target_band + plan)
//   - useSetTargetBand  (inline edit mutation)
// ─────────────────────────────────────────────────────────────────────────────

import { useState }          from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { useCurrentUser }    from "@/lib/hooks/useCurrentUser";
import { useSetTargetBand }  from "@/lib/hooks/useAccount";
import { useDashboardStats } from "@/lib/hooks/useDashboardStats";
import { cn }                from "@/lib/utils";

// Band numbers available for inline target edit (mirrors onboarding options)
const BAND_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// ── Sub-component: a single stat cell ─────────────────────────────────────────

interface StatCellProps {
  label:     string;
  value:     React.ReactNode;
  sublabel?: string;
  loading?:  boolean;
  action?:   React.ReactNode;
}

function StatCell({ label, value, sublabel, loading, action }: StatCellProps) {
  return (
    <div className="flex flex-col gap-0.5 sm:gap-1 rounded-xl border border-border bg-surface px-2.5 py-2.5 sm:px-5 sm:py-4">
      <div className="flex items-center justify-between">
        <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-subtle truncate">{label}</p>
        {action}
      </div>

      {loading ? (
        <div className="h-6 sm:h-8 w-10 sm:w-16 animate-pulse rounded bg-border" />
      ) : (
        <p className="text-lg sm:text-2xl font-bold text-foreground tabular-nums leading-none">
          {value}
        </p>
      )}

      {sublabel && !loading && (
        <p className="hidden sm:block text-xs text-subtle">{sublabel}</p>
      )}
    </div>
  );
}

// ── Target band inline editor ──────────────────────────────────────────────────

function TargetBandCell({ band }: { band: number | null }) {
  const [editing, setEditing]   = useState(false);
  const [draft,   setDraft]     = useState<number>(band ?? 9);
  const setTargetBand           = useSetTargetBand();

  async function handleSave() {
    try {
      await setTargetBand.mutateAsync({ target_band: draft });
      setEditing(false);
    } catch {
      // error surfaced via setTargetBand.isError
    }
  }

  function handleOpen() {
    setDraft(band ?? 9);
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-primary/30 bg-surface px-2.5 py-2.5 sm:px-5 sm:py-4 space-y-2 sm:space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
          Target Band
        </p>

        {/* Band grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {BAND_OPTIONS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setDraft(b)}
              aria-pressed={draft === b}
              className={cn(
                "rounded-lg border py-2 text-sm font-bold transition-colors",
                draft === b
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-subtle hover:border-primary/40 hover:text-foreground",
              )}
            >
              {b}
            </button>
          ))}
        </div>

        {setTargetBand.isError && (
          <p className="text-xs text-destructive">Failed to save. Try again.</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={setTargetBand.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-primary-hover transition-colors"
          >
            {setTargetBand.isPending
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
              : <><Check className="h-3 w-3" /> Save</>
            }
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={setTargetBand.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-subtle hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <StatCell
      label="Target Band"
      value={band !== null ? band : "—"}
      sublabel={band !== null ? `CELPIP goal · Band ${band} / 12` : "Not set"}
      action={
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Edit target band"
          className="rounded-md p-1 text-subtle hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      }
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardStatusRow() {
  const { user, isLoading: userLoading }   = useCurrentUser();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const loading = userLoading || statsLoading;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {/* Speaking */}
      <StatCell
        label="Speaking"
        value={stats?.latestSpeakingBand ?? "—"}
        sublabel="Latest band score"
        loading={loading}
      />

      {/* Writing */}
      <StatCell
        label="Writing"
        value={stats?.latestWritingBand ?? "—"}
        sublabel="Latest band score"
        loading={loading}
      />

      {/* Target band — has inline editor */}
      {userLoading ? (
        <StatCell label="Target Band" value="—" loading />
      ) : (
        <TargetBandCell band={user?.target_band ?? null} />
      )}
    </div>
  );
}
