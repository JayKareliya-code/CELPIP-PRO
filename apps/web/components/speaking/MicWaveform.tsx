"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MicWaveform.tsx — Real-time microphone-driven waveform visualiser
//
// Architecture (production-grade):
//   • AudioContext + MediaStream created once on mount via setupMic()
//   • Heights written DIRECTLY to DOM span elements via element refs —
//     no React re-renders at 60 fps, zero layout thrash
//   • isActive is read from a ref inside the rAF loop so the loop never
//     needs to re-attach when the prop changes
//   • On UNMOUNT: MediaStream tracks are stopped (mic indicator goes off)
//     and AudioContext is closed — no memory leaks, no persistent mic access
//   • Graceful degradation: if mic is denied or browser doesn't support
//     getUserMedia, bars animate via CSS keyframe fallback
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const BAR_COUNT         = 16;
const MIN_BAR_HEIGHT_PX = 4;
const MAX_BAR_HEIGHT_PX = 56;
const FFT_SIZE          = 256;

// ── Types ─────────────────────────────────────────────────────────────────────

interface MicWaveformProps {
  /** Pause the rAF loop when false (bars freeze). */
  isActive?: boolean;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MicWaveform({ isActive = true, className }: MicWaveformProps) {
  // DOM refs — write heights directly, never trigger React re-render
  const barRefs    = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef     = useRef<number | null>(null);

  // Audio pipeline refs — held for cleanup on unmount
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const dataRef      = useRef<Uint8Array<ArrayBuffer>>(
    new Uint8Array(0) as Uint8Array<ArrayBuffer>
  );

  // Stable ref so rAF loop reads latest isActive without re-attaching
  const isActiveRef  = useRef(isActive);
  isActiveRef.current = isActive;

  // ── Microphone setup ──────────────────────────────────────────────────────

  const setupMic = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();

      analyser.fftSize                = FFT_SIZE;
      analyser.smoothingTimeConstant  = 0.78; // smooths amplitude spikes

      source.connect(analyser);

      // Store refs for the rAF loop and cleanup
      streamRef.current   = stream;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current     = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    } catch {
      // Mic denied or unavailable — CSS fallback handles the visual
    }
  }, []);

  // ── Mount: start mic, start rAF loop ─────────────────────────────────────

  useEffect(() => {
    setupMic();

    // rAF draw loop — reads data directly from analyser into span heights
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const analyser = analyserRef.current;
      const data     = dataRef.current;

      if (!analyser || data.length === 0 || !isActiveRef.current) return;

      analyser.getByteFrequencyData(data);
      const binStep = Math.floor(data.length / BAR_COUNT);

      barRefs.current.forEach((el, i) => {
        if (!el) return;
        const raw    = data[i * binStep] ?? 0;                // 0–255
        const norm   = raw / 255;                              // 0.0–1.0
        const curved = Math.pow(norm, 0.6);                   // power curve — quiet voices still move
        const px     = MIN_BAR_HEIGHT_PX + curved * (MAX_BAR_HEIGHT_PX - MIN_BAR_HEIGHT_PX);
        el.style.height = `${px}px`;
      });
    };

    rafRef.current = requestAnimationFrame(draw);

    // ── Unmount cleanup — CRITICAL ──────────────────────────────────────────
    return () => {
      // 1. Cancel the animation frame
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // 2. Stop all microphone tracks → browser mic indicator turns off
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      // 3. Close the AudioContext → releases OS audio resources
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn("flex items-end justify-center gap-[3px]", className)}
      aria-hidden="true"
      aria-label="Voice level visualiser"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => { barRefs.current[i] = el; }}
          className={cn(
            "inline-block w-1.5 rounded-full transition-none",
            // Gradient opacity across the bar strip (brighter in centre)
            i < 2 || i >= BAR_COUNT - 2
              ? "bg-primary/40"
              : i < 4 || i >= BAR_COUNT - 4
                ? "bg-primary/65"
                : "bg-primary"
          )}
          style={{
            height: `${MIN_BAR_HEIGHT_PX}px`,
            // CSS idle animation — overridden by rAF heights once mic is live
            animation: isActive
              ? `mic-idle ${0.5 + (i % 5) * 0.15}s ease-in-out ${i * 40}ms infinite alternate`
              : "none",
          }}
        />
      ))}

      {/* Lightweight idle keyframe — bars breathe before mic connects */}
      <style>{`
        @keyframes mic-idle {
          from { height: ${MIN_BAR_HEIGHT_PX}px; }
          to   { height: ${MIN_BAR_HEIGHT_PX + 12}px; }
        }
      `}</style>
    </div>
  );
}
