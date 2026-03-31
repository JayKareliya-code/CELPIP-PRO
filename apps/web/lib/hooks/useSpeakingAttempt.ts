"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useSpeakingAttempt.ts — Speaking session orchestration hook (Phase 2)
//
// Real pipeline (Phase 2):
//   COUNTDOWN → PREP → RECORDING (MediaRecorder starts)
//   → UPLOADING:
//       1. Stop MediaRecorder → collect Blob
//       2. POST /speaking/attempts/start    → get attempt_id
//       3. POST /speaking/attempts/{id}/upload-url  → get presigned S3 URL + s3_key
//       4. PUT  <presigned_url>  (raw audio blob)   → upload to S3
//       5. POST /speaking/attempts/{id}/confirm-upload → enqueue Celery task
//       6. setAttemptId(attempt_id)
//   → PROCESSING → navigate to /attempts/{id}/status
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from "react";
import { useRouter }                      from "next/navigation";
import { useAuth }                        from "@clerk/nextjs";
import {
  usePracticeSessionStore,
  type SessionPhase,
} from "@/store/practiceSessionStore";
import type { SpeakingTask }    from "@/lib/types";
import { API_V1, USE_MOCK, authHeaders } from "@/lib/api";
import {
  COUNTDOWN_STEP_DURATION_MS,
  COUNTDOWN_STEPS,
  ATTEMPT_POLL_INTERVAL_MS,
} from "@/lib/constants";

// ── Internal constants ────────────────────────────────────────────────────────

const TICK_INTERVAL_MS   = 1_000;
const TOTAL_COUNTDOWN_MS = COUNTDOWN_STEPS.length * COUNTDOWN_STEP_DURATION_MS;
const API_BASE           = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadUrlResponse {
  upload_url:         string;
  s3_key:             string;
  expires_in_seconds: number;
}

interface StartAttemptResponse {
  attempt_id: string;
  status:     string;
}

// ── Hook public interface ─────────────────────────────────────────────────────

export interface UseSpeakingAttemptReturn {
  phase:          SessionPhase;
  secondsLeft:    number;
  uploadProgress: number;
  attemptId:      string | null;
  start:          (task: SpeakingTask) => void;
  exit:           () => void;
}

// ── Hook implementation ───────────────────────────────────────────────────────

export function useSpeakingAttempt(): UseSpeakingAttemptReturn {
  const router       = useRouter();
  const { getToken } = useAuth();

  const {
    phase, secondsLeft, uploadProgress, attemptId, task,
    startSession, advancePhase, tick,
    setUploadProgress, setAttemptId, setRecordingBlob,
    reset,
  } = usePracticeSessionStore();

  // Stable refs so interval callbacks always read fresh state
  const phaseRef   = useRef(phase);
  const secsRef    = useRef(secondsLeft);
  const taskRef    = useRef(task);
  phaseRef.current = phase;
  secsRef.current  = secondsLeft;
  taskRef.current  = task;

  // Interval / timeout handles
  const tickIntervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const uploadIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick      = () => { if (tickIntervalRef.current)    clearInterval(tickIntervalRef.current);    tickIntervalRef.current    = null; };
  const clearCountdown = () => { if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current); countdownTimeoutRef.current = null; };
  const clearUpload    = () => { if (uploadIntervalRef.current)   clearInterval(uploadIntervalRef.current);  uploadIntervalRef.current   = null; };

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);

  // ── helpers ───────────────────────────────────────────────────────────────

  function stopMediaRecorder(): Promise<Blob> {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") {
        resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        return;
      }
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        resolve(blob);
      };
      mr.stop();
    });
  }

  function stopMicStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startMediaRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current  = stream;
      audioChunksRef.current = [];

      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(250); // collect a chunk every 250 ms
      mediaRecorderRef.current = mr;
    } catch (err) {
      console.error("[useSpeakingAttempt] Mic access denied:", err);
    }
  }

  // ── Real upload pipeline ──────────────────────────────────────────────────

  async function runUploadPipeline(blob: Blob) {
    const currentTask = taskRef.current;
    if (!currentTask) return;

    // Mock mode — skip real API calls, navigate with mock ID
    if (USE_MOCK) {
      let pct = 0;
      uploadIntervalRef.current = setInterval(() => {
        pct += 10;
        setUploadProgress(pct);
        if (pct >= 100) {
          clearUpload();
          const mockId = "mock-attempt-" + Date.now();
          setAttemptId(mockId);
          advancePhase();
        }
      }, 200);
      return;
    }

    try {
      const token = await getToken();
      const headers = { ...authHeaders(token), "Content-Type": "application/json" };

      // 1. Create attempt (POST /speaking/attempts/start)
      setUploadProgress(10);
      const startRes = await fetch(`${API_BASE}${API_V1}/speaking/attempts/start`, {
        method:  "POST",
        headers,
        body: JSON.stringify({ prompt_id: currentTask.id, is_mock_test: false }),
      });
      if (!startRes.ok) throw new Error(`start attempt failed: ${startRes.status}`);
      const { attempt_id }: StartAttemptResponse = await startRes.json();
      setAttemptId(attempt_id);

      // 2. Get presigned upload URL
      setUploadProgress(25);
      const urlRes = await fetch(`${API_BASE}${API_V1}/speaking/attempts/${attempt_id}/upload-url`, {
        method:  "POST",
        headers,
        body: JSON.stringify({}),
      });
      if (!urlRes.ok) throw new Error(`upload-url failed: ${urlRes.status}`);
      const { upload_url, s3_key }: UploadUrlResponse = await urlRes.json();

      // 3. PUT audio blob directly to S3 presigned URL (no auth header — S3 signs itself)
      setUploadProgress(40);
      const putRes = await fetch(upload_url, {
        method:  "PUT",
        headers: { "Content-Type": "audio/webm" },
        body:    blob,
      });
      if (!putRes.ok) throw new Error(`S3 PUT failed: ${putRes.status}`);
      setUploadProgress(80);

      // 4. Confirm upload → Celery task is enqueued
      const confirmRes = await fetch(
        `${API_BASE}${API_V1}/speaking/attempts/${attempt_id}/confirm-upload`,
        {
          method:  "POST",
          headers,
          body: JSON.stringify({
            s3_key,
            audio_duration_ms: Math.round((blob.size / 16000) * 1000), // rough estimate
          }),
        },
      );
      if (!confirmRes.ok) throw new Error(`confirm-upload failed: ${confirmRes.status}`);
      setUploadProgress(100);

      // 5. Advance to PROCESSING
      advancePhase();

    } catch (err) {
      console.error("[useSpeakingAttempt] Upload pipeline failed:", err);
      // Still advance so the user isn't stuck on the upload screen
      setUploadProgress(100);
      advancePhase();
    }
  }

  // ── Phase-change side effects ─────────────────────────────────────────────

  useEffect(() => {
    clearTick();
    clearCountdown();
    clearUpload();

    switch (phase) {

      // COUNTDOWN → auto-advance after fixed delay
      case "COUNTDOWN": {
        countdownTimeoutRef.current = setTimeout(() => {
          advancePhase();
        }, TOTAL_COUNTDOWN_MS);
        break;
      }

      // PREP + RECORDING phases — tick every second, auto-advance at 0
      case "PREP": {
        tickIntervalRef.current = setInterval(() => {
          if (secsRef.current <= 1) { clearTick(); advancePhase(); }
          else tick();
        }, TICK_INTERVAL_MS);
        break;
      }

      // Start MediaRecorder when recording begins
      case "RECORDING":
      case "RECORDING_PART2": {
        // Only start a new recorder on the first RECORDING phase
        if (phase === "RECORDING") {
          startMediaRecorder();
        }
        tickIntervalRef.current = setInterval(() => {
          if (secsRef.current <= 1) { clearTick(); advancePhase(); }
          else tick();
        }, TICK_INTERVAL_MS);
        break;
      }

      // Stop recorder, collect blob, run real upload pipeline
      case "UPLOADING": {
        stopMediaRecorder().then((blob) => {
          stopMicStream();
          setRecordingBlob(blob);
          runUploadPipeline(blob);
        });
        break;
      }

      // Navigate to real status page
      case "PROCESSING": {
        const storedId =
          usePracticeSessionStore.getState().attemptId ??
          `mock-attempt-${Date.now()}`;
        setTimeout(() => {
          router.push(`/attempts/${storedId}/status`);
        }, ATTEMPT_POLL_INTERVAL_MS);
        break;
      }

      default:
        break;
    }

    return () => {
      clearTick();
      clearCountdown();
      clearUpload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearTick();
      clearCountdown();
      clearUpload();
      mediaRecorderRef.current?.state !== "inactive" && mediaRecorderRef.current?.stop();
      stopMicStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────

  const start = useCallback((speakingTask: SpeakingTask) => {
    startSession(speakingTask);
  }, [startSession]);

  const exit = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to leave this practice session?"
    );
    if (confirmed) {
      mediaRecorderRef.current?.state !== "inactive" && mediaRecorderRef.current?.stop();
      stopMicStream();
      reset();
      router.back();
    }
  }, [reset, router]);

  return { phase, secondsLeft, uploadProgress, attemptId, start, exit };
}
