"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/settings/hooks/useDataExport.ts
//
// Encapsulates the GDPR data-export request + polling lifecycle.
// Extracted from the settings page so it can be tested and reused independently.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ExportJob } from "@/components/settings/types";

export interface UseDataExportReturn {
  job:           ExportJob | null;
  loading:       boolean;
  error:         string | null;
  requestExport: () => Promise<void>;
}

/**
 * Manages the full data-export lifecycle:
 *   1. POST  /users/me/export         → starts the job, gets job_id
 *   2. Polls GET /users/me/export/status/:job_id every 5 s until terminal state
 *
 * Rate-limit (429) is surfaced as a human-readable error string.
 */
export function useDataExport(): UseDataExportReturn {
  const [jobId,   setJobId]   = useState<string | null>(null);
  const [job,     setJob]     = useState<ExportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling ───────────────────────────────────────────────────────────────

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
    }, 5_000);

    return () => clearInterval(pollRef.current!);
  }, [jobId, job?.status]);

  // ── Request ───────────────────────────────────────────────────────────────

  async function requestExport(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ job_id: string }>("/users/me/export", { method: "POST" });
      setJobId(res.job_id);
      setJob({
        job_id:        res.job_id,
        status:        "pending",
        download_url:  null,
        expires_at:    null,
        error_message: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("429")
          ? "You can only request one export every 24 hours."
          : "Failed to start export. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  }

  return { job, loading, error, requestExport };
}
