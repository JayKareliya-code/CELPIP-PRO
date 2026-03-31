// ─────────────────────────────────────────────────────────────────────────────
// ProcessingScreen.tsx — "Analyzing your response…" screen
//
// Shared by speaking and writing flows. Shown after upload completes.
// Presents a spinner + friendly message while polling the backend.
// ─────────────────────────────────────────────────────────────────────────────

import { Loader2, Mic, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/types";

// ── Per-skill copy ─────────────────────────────────────────────────────────────

const COPY = {
  speaking: {
    icon:    Mic,
    heading: "Analyzing Your Response",
    body:    "Our AI is evaluating your vocabulary, grammar, coherence, and pronunciation. This usually takes about 30 seconds.",
  },
  writing: {
    icon:    PenLine,
    heading: "Reviewing Your Essay",
    body:    "Our AI is evaluating your task achievement, coherence, lexical resource, and grammatical range. This usually takes about 30 seconds.",
  },
} as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProcessingScreenProps {
  /** Controls which icon and copy is displayed. */
  skill: Skill;
  className?: string;
}

/**
 * Shared "processing" screen shown during the PROCESSING session phase.
 * No polling logic here — the parent hook owns that; this is purely presentational.
 */
export function ProcessingScreen({ skill, className }: ProcessingScreenProps) {
  const { icon: Icon, heading, body } = COPY[skill];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-8 min-h-screen",
        "bg-canvas text-canvas-text px-6",
        className
      )}
    >
      {/* Pulsing icon ring */}
      <div className="relative flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/30">
          <Icon className="w-9 h-9 text-primary" />
        </div>
      </div>

      {/* Spinner */}
      <Loader2 className="w-8 h-8 text-primary animate-spin" />

      {/* Copy */}
      <div className="text-center max-w-sm space-y-2">
        <h2 className="text-2xl font-bold text-canvas-text">{heading}</h2>
        <p className="text-sm text-canvas-subtle leading-relaxed">{body}</p>
      </div>

      {/* Animated progress dots — animation-delay-* utilities from globals.css */}
      <div className="flex gap-2" aria-hidden="true">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse animation-delay-300" />
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse animation-delay-500" />
      </div>
    </div>
  );
}
