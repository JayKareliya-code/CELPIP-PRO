"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useMockTaskUpload — upload pipeline for a single mock exam task audio.
//
// Mirrors useSpeakingUpload but targets the mock-exam endpoints and stores
// audio under the dedicated "mock-tests/" S3 prefix.
//
// Real pipeline:
//   1. POST /mock-exam/attempts/{sessionId}/tasks/{taskNumber}/upload-url
//        → { upload_url, s3_key }
//   2. PUT  <presigned_url>  (raw audio blob → S3 under mock-tests/)
//   3. POST /mock-exam/attempts/{sessionId}/tasks/{taskNumber}/confirm-upload
//        → { attempt_id }
//
// Mock mode: simulates progress then returns a fake attempt ID.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { useAuth }          from "@clerk/nextjs";
import { API_V1, USE_MOCK, authHeaders } from "@/lib/api";
import type { MockExamPrompt } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadUrlResponse {
  upload_url: string;
  s3_key:     string;
}

interface ConfirmUploadResponse {
  attempt_id: string;
}

export interface UseMockTaskUploadReturn {
  /**
   * Run the full upload pipeline.
   * Resolves with the attempt_id on success, or null on failure.
   */
  runMockTaskUpload: (
    blob:        Blob,
    prompt:      MockExamPrompt,
    sessionId:   string,
    recordingStartMs: number | null,
  ) => Promise<string | null>;
  /** Cancel the mock-mode progress simulation. */
  cancelMockUpload:  () => void;
  uploadError:       string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMockTaskUpload(
  onProgress: (pct: number) => void,
): UseMockTaskUploadReturn {
  const { getToken }    = useAuth();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function cancelMockUpload() {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }

  async function runMockTaskUpload(
    blob:             Blob,
    prompt:           MockExamPrompt,
    sessionId:        string,
    recordingStartMs: number | null,
  ): Promise<string | null> {
    setUploadError(null);

    // ── Mock / dev mode ──────────────────────────────────────────────────────
    if (USE_MOCK) {
      return new Promise<string>((resolve) => {
        let pct = 0;
        mockIntervalRef.current = setInterval(() => {
          pct += 12;
          onProgress(Math.min(pct, 100));
          if (pct >= 100) {
            cancelMockUpload();
            resolve(`mock-task-attempt-${prompt.task_number}-${Date.now()}`);
          }
        }, 180);
      });
    }

    // ── Real upload pipeline ─────────────────────────────────────────────────
    try {
      const token   = await getToken();
      const headers = { ...authHeaders(token), "Content-Type": "application/json" };
      const taskN   = prompt.task_number;
      const baseUrl = `${API_BASE}${API_V1}/mock-exam/attempts/${sessionId}/tasks/${taskN}`;

      // Step 1 — get presigned upload URL
      onProgress(15);
      const urlRes = await fetch(`${baseUrl}/upload-url`, {
        method: "POST",
        headers,
        body:   JSON.stringify({ prompt_id: prompt.id }),
      });
      if (!urlRes.ok) throw new Error(`upload-url failed: ${urlRes.status}`);
      const { upload_url, s3_key }: UploadUrlResponse = await urlRes.json();

      // Step 2 — PUT blob to S3
      onProgress(35);
      const putRes = await fetch(upload_url, {
        method:  "PUT",
        headers: { "Content-Type": "audio/webm" },
        body:    blob,
      });
      if (!putRes.ok) throw new Error(`S3 PUT failed: ${putRes.status}`);
      onProgress(75);

      // Step 3 — confirm upload
      const durationMs = recordingStartMs ? Date.now() - recordingStartMs : 0;
      const confirmRes = await fetch(`${baseUrl}/confirm-upload`, {
        method: "POST",
        headers,
        body:   JSON.stringify({ s3_key, audio_duration_ms: durationMs }),
      });
      if (!confirmRes.ok) throw new Error(`confirm-upload failed: ${confirmRes.status}`);
      const { attempt_id }: ConfirmUploadResponse = await confirmRes.json();
      onProgress(100);
      return attempt_id;

    } catch (err) {
      console.error("[useMockTaskUpload] Upload failed:", err);
      const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
      setUploadError(msg);
      onProgress(0);
      return null;
    }
  }

  return { runMockTaskUpload, cancelMockUpload, uploadError };
}
