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
 */

import { useRef, useState } from "react";
import { useAuth }          from "@clerk/nextjs";
import { usePracticeSessionStore } from "@/store/practiceSessionStore";
import type { SpeakingTask }       from "@/lib/types";
import { API_V1, USE_MOCK, authHeaders } from "@/lib/api";
import type { StartAttemptResponse, UploadUrlResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface UseSpeakingUploadReturn {
  /** Run the full upload pipeline for the given audio blob. */
  runUploadPipeline:  (blob: Blob) => Promise<void>;
  /**
   * Cancel the mock-mode progress simulation interval.
   * Call from phase-effect cleanup so the interval doesn't
   * outlive the UPLOADING phase.
   */
  cancelMockUpload:   () => void;
  /** Non-null when the pipeline fails; null on success or before first run. */
  uploadError:        string | null;
}

export function useSpeakingUpload(
  taskRef:           React.MutableRefObject<SpeakingTask | null>,
  recordingStartRef: React.MutableRefObject<number | null>,
): UseSpeakingUploadReturn {
  const { getToken } = useAuth();
  const { setUploadProgress, setAttemptId, advancePhase } = usePracticeSessionStore();

  const [uploadError, setUploadError] = useState<string | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function cancelMockUpload() {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }

  async function runUploadPipeline(blob: Blob) {
    const currentTask = taskRef.current;
    if (!currentTask) return;

    // ── Mock mode ────────────────────────────────────────────────────────────
    if (USE_MOCK) {
      let pct = 0;
      mockIntervalRef.current = setInterval(() => {
        pct += 10;
        setUploadProgress(pct);
        if (pct >= 100) {
          cancelMockUpload();
          setAttemptId("mock-attempt-" + Date.now());
          advancePhase();
        }
      }, 200);
      return;
    }

    // ── Real pipeline ────────────────────────────────────────────────────────
    try {
      const token   = await getToken();
      const headers = { ...authHeaders(token), "Content-Type": "application/json" };

      // Step 1 — create attempt
      setUploadProgress(10);
      const startRes = await fetch(`${API_BASE}${API_V1}/speaking/attempts/start`, {
        method: "POST",
        headers,
        body:   JSON.stringify({ prompt_id: currentTask.id, is_mock_test: false }),
      });
      if (!startRes.ok) throw new Error(`start attempt failed: ${startRes.status}`);
      const { attempt_id }: StartAttemptResponse = await startRes.json();
      setAttemptId(attempt_id);

      // Step 2 — get presigned upload URL
      setUploadProgress(25);
      const urlRes = await fetch(
        `${API_BASE}${API_V1}/speaking/attempts/${attempt_id}/upload-url`,
        { method: "POST", headers, body: JSON.stringify({}) },
      );
      if (!urlRes.ok) throw new Error(`upload-url failed: ${urlRes.status}`);
      const { upload_url, s3_key }: UploadUrlResponse = await urlRes.json();

      // Step 3 — PUT blob directly to S3 (no auth header — presigned URL handles auth)
      setUploadProgress(40);
      const putRes = await fetch(upload_url, {
        method:  "PUT",
        headers: { "Content-Type": "audio/webm" },
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
        `${API_BASE}${API_V1}/speaking/attempts/${attempt_id}/confirm-upload`,
        {
          method:  "POST",
          headers,
          body: JSON.stringify({ s3_key, audio_duration_ms: recordingDurationMs }),
        },
      );
      if (!confirmRes.ok) throw new Error(`confirm-upload failed: ${confirmRes.status}`);
      setUploadProgress(100);

      advancePhase();

    } catch (err) {
      console.error("[useSpeakingUpload] Upload pipeline failed:", err);
      // Reset progress and surface the error. Do NOT advance phase — navigating
      // with a null attempt ID would route the user to a garbage URL.
      setUploadProgress(0);
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    }
  }

  return { runUploadPipeline, cancelMockUpload, uploadError };
}
