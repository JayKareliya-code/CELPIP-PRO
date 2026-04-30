"use client";

// ─────────────────────────────────────────────────────────────────────────────
// LockedDimensionPreview.tsx — Shows rubric dimension names with locked scores
//
// Renders for Starter plan users: dimension names are fully visible
// (communicates what Pro unlocks) but score values and bars are hidden.
// ─────────────────────────────────────────────────────────────────────────────

import { Lock } from "lucide-react";
import type { Skill } from "@/lib/types";

// Static dimension labels per skill — mirrors report_service._DIMENSION_LABELS
const SPEAKING_DIMENSIONS = [
  "Task Completion",
  "Coherence & Cohesion",
  "Vocabulary Range",
  "Fluency & Pronunciation",
  "Grammatical Accuracy",
];

const WRITING_DIMENSIONS = [
  "Task Fulfillment",
  "Organization",
  "Vocabulary Range",
  "Grammatical Accuracy",
  "Tone & Register",
];

interface Props {
  skill: Skill;
}

export function LockedDimensionPreview({ skill }: Props) {
  const dims = skill === "speaking" ? SPEAKING_DIMENSIONS : WRITING_DIMENSIONS;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-subtle">
          Dimension Breakdown
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-subtle">
          <Lock className="h-3 w-3" />
          Pro
        </span>
      </div>

      <div className="space-y-4">
        {dims.map((label) => (
          <div key={label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground/80">{label}</span>
              {/* Score hidden */}
              <span className="text-sm font-bold text-subtle/40 tabular-nums select-none">
                —&nbsp;<span className="font-normal text-subtle/30">/12</span>
              </span>
            </div>
            {/* Bar: track only, no fill */}
            <div className="h-2 w-full rounded-full bg-border" />
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-xs text-subtle">
        Upgrade to Pro to see your score per dimension
      </p>
    </div>
  );
}
