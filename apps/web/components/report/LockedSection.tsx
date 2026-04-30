"use client";

// ─────────────────────────────────────────────────────────────────────────────
// LockedSection.tsx — Frosted content gate for Starter-plan users
//
// Wraps any content in a blurred overlay with a lock indicator and message.
// The children are rendered at reduced opacity + blur — they communicate
// "this exists, here's what it looks like" without revealing the data.
// ─────────────────────────────────────────────────────────────────────────────

import { Lock } from "lucide-react";

interface Props {
  /** Short label shown above the lock icon */
  title: string;
  /** One-line description of what unlocks */
  description: string;
}

export function LockedSection({ title, description }: Props) {
  return (
    <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Blurred placeholder content */}
      <div className="px-6 py-5 select-none pointer-events-none" aria-hidden="true">
        <div className="h-4 w-36 rounded bg-white/5 mb-4" />
        <div className="space-y-2.5">
          {[80, 60, 72, 55].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-white/5 flex-shrink-0" />
              <div className={`h-3 rounded bg-white/5`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Frosted overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e0e0e]/80 backdrop-blur-[2px]">
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface">
            <Lock className="h-4 w-4 text-subtle" />
          </div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-subtle leading-relaxed max-w-xs">{description}</p>
        </div>
      </div>
    </div>
  );
}
