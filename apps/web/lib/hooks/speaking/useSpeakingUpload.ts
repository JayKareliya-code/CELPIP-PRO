"use client";

/**
 * useSpeakingUpload — 4-step upload pipeline for a speaking attempt.
 *
 * Real pipeline:
 *   1. POST /speaking/attempts/start       → attempt_id
 *   2. POST /speaking/attempts/{id}/upload-url → presigned S3 URL + s3_key
 *   3. PUT  <presigned_url>                → upload raw audio blob to S3
 *   4. POST /speaking/attempts/{id}/confirm-upload → enqueue Celery task
 *
 * Mock mode (USE_MOCK=true): simulates progress with a setInterval, then
 * advances phase with a fake attempt ID.
 *
 * Safety guarantees (production hardening):
 *   - AbortController: every fetch in the real pipeline is cancellable.
 *     Call cancelUpload() on unmount or phase-effect cleanup — this is
 *     wired into useSpeakingAttempt's cleanup so no request outlives the
 *     component that started it.
 *   - MIME type: the resolved mimeType from useMediaRecorder is forwarded
 *     as the S3 Content-Type header, ensuring cross-browser accuracy.
 */

import { useRef, useState } from "react";
import { useAuth }          from "@clerk/nextjs";
import { usePracticeSessionStore } from "@/store/practiceSessionStore";
import type { SpeakingTask }       from "@/lib/types";
import { API_BASE_URL, API_V1, USE_MOCK, authHeaders } from "@/lib/api";
import type { StartAttemptResponse, UploadUrlResponse } from "./types";

// ── Public interface ──────────────────────────────────────────────────────────

export interface UseSpeakingUploadReturn {
  /** Run the full upload pipeline for the given audio blob. */
  runUploadPipeline:  (blob: Blob, mimeType?: string) => Promise<void>;
  /**
   * Cancel any in-flight upload (real pipeline via AbortController,
   * mock mode via clearInterval). Safe to call multiple times.
   */
  cancelUpload:       () => void;
  /** Non-null when the pipeline fails; null on success or before first run. */
  uploadError:        string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSpeakingUpload(
  taskRef:           React.MutableRefObject<SpeakingTask | null>,
  recordingStartRef: React.MutableRefObject<number | null>,
): UseSpeakingUploadReturn {
  const { getToken } = useAuth();
  const { setUploadProgress, setAttemptId, advancePhase } = usePracticeSessionStore();

  const [uploadError, setUploadError] = useState<string | null>(null);

  // Mock-mode interval handle
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Real-pipeline abort controller
  const abortRef = useRef<AbortController | null>(null);

  /** Cancel both the mock interval and any real fetch pipeline. */
  function cancelUpload() {
    // Cancel real pipeline
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Cancel mock interval
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }

  async function runUploadPipeline(blob: Blob, mimeType = "audio/webm") {
    setUploadError(null); // clear any error from a previous run
    const currentTask = taskRef.current;
    if (!currentTask) return;

    // ── Mock mode ────────────────────────────────────────────────────────────
    if (USE_MOCK) {
      let pct = 0;
      mockIntervalRef.current = setInterval(() => {
        pct += 10;
        setUploadProgress(pct);
        if (pct >= 100) {
          cancelUpload();
          setAttemptId("mock-attempt-" + Date.now());
          advancePhase();
        }
      }, 200);
      return;
    }

    // ── Real pipeline ────────────────────────────────────────────────────────
    // Create a fresh AbortController for this run.
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    try {
      const token   = await getToken();
      const headers = { ...authHeaders(token), "Content-Type": "application/json" };

      // Step 1 — create attempt
      setUploadProgress(10);
      const startRes = await fetch(`${API_BASE_URL}${API_V1}/speaking/attempts/start`, {
        method: "POST",
        headers,
        signal,
        body:   JSON.stringify({ prompt_id: currentTask.id, is_mock_test: false }),
      });
      if (!startRes.ok) throw new Error(`start attempt failed: ${startRes.status}`);
      const { attempt_id }: StartAttemptResponse = await startRes.json();
      setAttemptId(attempt_id);

      // Step 2 — get presigned upload URL
      setUploadProgress(25);
      const urlRes = await fetch(
        `${API_BASE_URL}${API_V1}/speaking/attempts/${attempt_id}/upload-url`,
        { method: "POST", headers, signal, body: JSON.stringify({}) },
      );
      if (!urlRes.ok) throw new Error(`upload-url failed: ${urlRes.status}`);
      const { upload_url, s3_key }: UploadUrlResponse = await urlRes.json();

      // Step 3 — PUT blob directly to S3 (no auth header — presigned URL handles auth)
      // Use the resolved mimeType from useMediaRecorder for cross-browser accuracy.
      setUploadProgress(40);
      const putRes = await fetch(upload_url, {
        method:  "PUT",
        headers: { "Content-Type": mimeType || "audio/webm" },
        signal,
        body:    blob,
      });
      if (!putRes.ok) throw new Error(`S3 PUT failed: ${putRes.status}`);
      setUploadProgress(80);

      // Step 4 — confirm upload → enqueues Celery scoring task
      // Use wall-clock elapsed time; blob.size / bitrate is wrong for compressed audio.
      const recordingDurationMs = recordingStartRef.current
        ? Date.now() - recordingStartRef.current
        : 0;
      const confirmRes = await fetch(
        `${API_BASE_URL}${API_V1}/speaking/attempts/${attempt_id}/confirm-upload`,
        {
          method:  "POST",
          headers,
          signal,
          body: JSON.stringify({ s3_key, audio_duration_ms: recordingDurationMs }),
        },
      );
      if (!confirmRes.ok) throw new Error(`confirm-upload failed: ${confirmRes.status}`);
      setUploadProgress(100);

      advancePhase();

    } catch (err) {
      // AbortError means the caller cancelled intentionally — not a user-visible error.
      if (err instanceof Error && err.name === "AbortError") return;

      console.error("[useSpeakingUpload] Upload pipeline failed:", err);
      // Reset progress and surface the error. Do NOT advance phase — navigating
      // with a null attempt ID would route the user to a garbage URL.
      setUploadProgress(0);
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    }
  }

  return { runUploadPipeline, cancelUpload, uploadError };
}
