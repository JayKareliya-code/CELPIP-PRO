"use client";

/**
 * useMediaRecorder — microphone + MediaRecorder lifecycle.
 *
 * Owns all mutable recorder state via refs so the hook is stable
 * across re-renders and safe to call from async phase effects.
 *
 * Mic lifecycle contract:
 *   - Mic turns ON  in startRecording() — getUserMedia is called here only.
 *   - Mic turns OFF inside stopRecording() — stream tracks are stopped as
 *     soon as the MediaRecorder fires its onstop event, BEFORE the caller
 *     receives the Blob. The browser mic indicator goes dark immediately.
 *   - forceStop() covers unmount / exit paths (calls stop + stopMicStream).
 *   - stopMicStream() is still exported for callers that want an explicit
 *     release, but stopRecording() makes it redundant in normal flow.
 */

import { useRef } from "react";

export interface UseMediaRecorderReturn {
  /** Request mic access and start collecting audio chunks. */
  startRecording:    () => Promise<void>;
  /** Stop the recorder, release the mic stream, and resolve with the Blob. */
  stopRecording:     () => Promise<Blob>;
  /** Explicitly release all mic tracks (idempotent). */
  stopMicStream:     () => void;
  /**
   * Hard-stop used during exit / unmount — stops the recorder (if active)
   * and releases the mic stream in one call.
   */
  forceStop:         () => void;
  /** Timestamp (ms) of when startRecording was called. Null before first recording. */
  recordingStartRef: React.MutableRefObject<number | null>;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);
  const streamRef         = useRef<MediaStream | null>(null);
  const recordingStartRef = useRef<number | null>(null);

  /** Release all tracks on the current stream and clear the ref. */
  function stopMicStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    // Guard: release any previously leaked stream before requesting a new one.
    stopMicStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current      = stream;
      audioChunksRef.current = [];

      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.start(250); // collect a chunk every 250 ms
      mediaRecorderRef.current  = mr;
      recordingStartRef.current = Date.now();
    } catch (err) {
      console.error("[useMediaRecorder] Mic access denied:", err);
    }
  }

  function stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;

      if (!mr || mr.state === "inactive") {
        // Already stopped — release stream and resolve immediately.
        stopMicStream();
        resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        return;
      }

      mr.onstop = () => {
        // ▶ Release mic HERE — before the caller even receives the Blob.
        //   This makes the browser mic indicator go dark instantly.
        stopMicStream();
        resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
      };

      mr.stop();
    });
  }

  function forceStop() {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    stopMicStream();
  }

  return { startRecording, stopRecording, stopMicStream, forceStop, recordingStartRef };
}

