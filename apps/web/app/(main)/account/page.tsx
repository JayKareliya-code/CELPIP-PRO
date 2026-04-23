"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useDeleteAccount } from "@/lib/hooks/useAccount";
import { apiFetch } from "@/lib/api";

// ── GDPR Export hook ──────────────────────────────────────────────────────────

type ExportStatus = "idle" | "pending" | "processing" | "complete" | "failed";

interface ExportJob {
  job_id: string;
  status: ExportStatus;
  download_url: string | null;
  expires_at: string | null;
  error_message: string | null;
}

function useDataExport() {
  const [jobId, setJobId]     = useState<string | null>(null);
  const [job, setJob]         = useState<ExportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll until terminal state
  useEffect(() => {
    if (!jobId) return;
    if (job?.status === "complete" || job?.status === "failed") return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await apiFetch<ExportJob>(`/users/me/export/status/${jobId}`);
        setJob(data);
        if (data.status === "complete" || data.status === "failed") {
          clearInterval(pollRef.current!);
        }
      } catch {
        clearInterval(pollRef.current!);
      }
    }, 5000);

    return () => clearInterval(pollRef.current!);
  }, [jobId, job?.status]);

  async function requestExport() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ job_id: string }>("/users/me/export", {
        method: "POST",
      });
      setJobId(res.job_id);
      setJob({ job_id: res.job_id, status: "pending", download_url: null, expires_at: null, error_message: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("429")
          ? "You can only request one export every 24 hours."
          : "Failed to start export. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }

  return { job, loading, error, requestExport };
}

// ── Countdown helper ──────────────────────────────────────────────────────────

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("expired"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setRemaining(`${h}h ${m}m remaining`);
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return <span className="text-xs text-gray-400 ml-2">{remaining}</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const deleteAccount = useDeleteAccount();
  const { job, loading, error: exportError, requestExport } = useDataExport();

  const [confirmText, setConfirmText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading || !user) {
    return <div className="p-8">Loading…</div>;
  }

  const canDelete = confirmText === "DELETE";

  async function handleDelete() {
    try {
      await deleteAccount.mutateAsync();
      router.push("/");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Account deletion failed", err);
    }
  }

  const exportInProgress = job?.status === "pending" || job?.status === "processing";

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
      </header>

      {/* ── GDPR Export ─────────────────────────────────────────────────── */}
      <section className="border border-gray-200 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold">Download my data</h2>
        <p className="text-sm text-gray-600">
          Request a copy of all your data: practice attempts, recordings, AI
          score reports, and billing history. The download link is valid for{" "}
          <strong>24 hours</strong>. You can request a new export once every
          24 hours.
        </p>

        {/* Error message */}
        {exportError && (
          <p className="text-sm text-red-600" role="alert">{exportError}</p>
        )}

        {/* Idle / request button */}
        {!job && (
          <button
            id="btn-request-data-export"
            type="button"
            onClick={requestExport}
            disabled={loading}
            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Requesting…" : "Request data export"}
          </button>
        )}

        {/* In-progress spinner */}
        {job && exportInProgress && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <svg
              className="animate-spin h-4 w-4 text-amber-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Building your export… this may take a minute.
          </div>
        )}

        {/* Complete — show download link */}
        {job?.status === "complete" && job.download_url && (
          <div className="flex flex-col gap-1">
            <a
              id="link-download-export"
              href={job.download_url}
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium w-fit transition-colors"
            >
              ↓ Download my data (.zip)
            </a>
            {job.expires_at && <ExpiryCountdown expiresAt={job.expires_at} />}
          </div>
        )}

        {/* Failed */}
        {job?.status === "failed" && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">
              Export failed: {job.error_message ?? "unknown error"}. Please try again later.
            </p>
            <button
              type="button"
              onClick={requestExport}
              className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm"
            >
              Retry
            </button>
          </div>
        )}
      </section>

      {/* ── Danger Zone ─────────────────────────────────────────────────── */}
      <section className="border border-red-300 rounded-lg p-6 bg-red-50">
        <h2 className="text-lg font-semibold text-red-800">Danger zone</h2>
        <p className="text-sm text-red-700 mt-2">
          Deleting your account permanently removes all your practice attempts,
          recordings, scoring reports, and subscription. This cannot be undone.
        </p>

        {!confirmOpen ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="mt-4 px-4 py-2 rounded bg-red-600 text-white text-sm"
          >
            Delete my account
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-red-800">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border border-red-400 rounded px-3 py-2 text-sm"
              placeholder="DELETE"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || deleteAccount.isPending}
                className="px-4 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50"
              >
                {deleteAccount.isPending ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmText("");
                }}
                className="px-4 py-2 rounded border border-gray-300 text-sm"
              >
                Cancel
              </button>
            </div>
            {deleteAccount.isError && (
              <p className="text-sm text-red-700">
                Failed to delete: {String(deleteAccount.error)}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
