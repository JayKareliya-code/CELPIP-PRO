"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/settings/tabs/DangerTab.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState }        from "react";
import { useRouter }       from "next/navigation";
import { Loader2, Trash2, X } from "lucide-react";

import { useDeleteAccount } from "@/lib/hooks/useAccount";

const CONFIRM_KEYWORD = "DELETE";

export function DangerTab() {
  const router        = useRouter();
  const deleteAccount = useDeleteAccount();

  const [confirmText, setConfirmText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canDelete = confirmText === CONFIRM_KEYWORD;

  async function handleDelete() {
    try {
      await deleteAccount.mutateAsync();
      router.push("/");
    } catch (err) {
      // error surfaced via deleteAccount.isError
      console.error("Account deletion failed", err);
    }
  }

  function handleCancel() {
    setConfirmOpen(false);
    setConfirmText("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 space-y-4">

        {/* ── Description ────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold text-red-400">Delete Account</h2>
          <p className="mt-1 text-sm text-white/50 leading-relaxed">
            Permanently removes all your practice attempts, recordings, AI score
            reports, and subscription.{" "}
            <strong className="text-white/70">This cannot be undone.</strong>
          </p>
        </div>

        {/* ── Idle — show delete button ──────────────────────────────────── */}
        {!confirmOpen && (
          <button
            id="btn-open-delete-confirm"
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete my account
          </button>
        )}

        {/* ── Confirm flow ───────────────────────────────────────────────── */}
        {confirmOpen && (
          <div className="space-y-3 pt-1">
            <label className="block text-sm text-white/60">
              Type{" "}
              <span className="font-mono font-bold text-red-400">
                {CONFIRM_KEYWORD}
              </span>{" "}
              to confirm:
            </label>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_KEYWORD}
              autoFocus
              className="w-full max-w-xs rounded-xl border border-red-500/30 bg-white/[0.03] px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 transition-all"
            />

            <div className="flex gap-3">
              <button
                id="btn-confirm-delete"
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || deleteAccount.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                {deleteAccount.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 className="h-4 w-4" /> Confirm delete</>
                )}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={deleteAccount.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>

            {deleteAccount.isError && (
              <p className="text-sm text-red-400">
                Failed to delete: {String(deleteAccount.error)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
