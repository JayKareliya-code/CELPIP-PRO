// ─────────────────────────────────────────────────────────────────────────────
// UploadProgressBar.tsx — S3 upload progress indicator
//
// Shown during the UPLOADING session phase.
// Progress is driven by useSpeakingAttempt (simulated in Phase 1, real in Phase 2).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { AlertTriangle, RefreshCw, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface UploadProgressBarProps {
  /** Upload progress 0–100 */
  progress: number;
  /** Non-null when the upload failed; renders an error state with retry CTA. */
  error?:    string | null;
  /** Called when the user clicks "Retry upload". Required if `error` is set. */
  onRetry?:  () => void;
  className?: string;
}

/**
 * Full-canvas upload progress screen.
 *
 * Two modes:
 *   - Default: animated progress bar.
 *   - Error:   swaps to an alert icon + Retry button when `error` is set.
 *              Without this the previous UI left users stuck on a 0% bar
 *              with no way to recover except navigating away.
 */
export function UploadProgressBar({ progress, error, onRetry, className }: UploadProgressBarProps) {
  const clamped  = Math.min(100, Math.max(0, progress));
  const isError  = !!error;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-8 h-full bg-canvas px-6",
        className,
      )}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-full border",
          isError
            ? "bg-danger/10 border-danger/30"
            : "bg-primary/10 border-primary/30",
        )}
      >
        {isError
          ? <AlertTriangle className="w-9 h-9 text-danger" aria-hidden="true" />
          : <Upload className="w-9 h-9 text-primary" aria-hidden="true" />}
      </div>

      {/* Heading */}
      <div className="text-center space-y-2 max-w-md">
        {isError ? (
          <>
            <h2 className="text-2xl font-bold text-canvas-text">Upload failed</h2>
            <p className="text-sm text-canvas-subtle">
              {error || "We couldn't upload your recording. Your audio is still here — please try again."}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-canvas-text">Uploading Your Response</h2>
            <p className="text-sm text-canvas-subtle">
              Please stay on this page while we securely upload your recording.
            </p>
          </>
        )}
      </div>

      {isError ? (
        // Retry CTA — reuses the in-memory blob so the user doesn't re-record.
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-2 rounded-full",
            "bg-primary px-5 py-2.5 text-sm font-semibold text-black",
            "hover:bg-primary-hover transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          )}
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Retry upload
        </button>
      ) : (
        // Progress bar — plain div to avoid base-ui double-track render
        <div className="w-full max-w-sm space-y-3">
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${clamped}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-canvas-subtle">
            <span>Uploading…</span>
            <span aria-label={`${clamped} percent`}>{clamped}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
