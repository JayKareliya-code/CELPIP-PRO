"use client";

/**
 * useMediaRecorder — microphone + MediaRecorder lifecycle.
 *
 * Owns all mutable recorder state via refs so the hook is stable
 * across re-renders and safe to call from async phase effects.
 */

import { useRef } from "react";

export interface UseMediaRecorderReturn {
  /** Request mic access and start collecting audio chunks. */
  startRecording:    () => Promise<void>;
  /** Stop the recorder and resolve with the collected Blob. */
  stopRecording:     () => Promise<Blob>;
  /** Release all mic tracks. */
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

  async function startRecording() {
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
        resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        return;
      }
      mr.onstop = () => {
        resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
      };
      mr.stop();
    });
  }

  function stopMicStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function forceStop() {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    stopMicStream();
  }

  return { startRecording, stopRecording, stopMicStream, forceStop, recordingStartRef };
}
