"use client";

// ─────────────────────────────────────────────────────────────────────────────
// LockedBlurOverlay.tsx — Frosted-glass lock wrapper
//
// Renders real component content underneath a blur + opacity filter so the
// user can see the structure / shape of the data without reading specific
// details. A centred lock badge floats on top with an upgrade prompt.
//
// Usage:
//   <LockedBlurOverlay label="Upgrade to Pro">
//     <SomeRealComponent />
//   </LockedBlurOverlay>
// ─────────────────────────────────────────────────────────────────────────────

import Link            from "next/link";
import { Lock }        from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  children:    ReactNode;
  /** Short description shown on the lock badge. Defaults to "Pro Feature". */
  label?:      string;
  /** Blur strength in px. Defaults to 5. */
  blurPx?:     number;
  /** Content opacity (0–1). Defaults to 0.35. */
  opacity?:    number;
}

export function LockedBlurOverlay({
  children,
  label    = "Pro Feature",
  blurPx   = 5,
  opacity  = 0.35,
}: Props) {
  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Real content — blurred + dimmed, non-interactive */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: `blur(${blurPx}px)`, opacity }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Frosted overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/60 backdrop-blur-[1px]">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          {/* Lock badge */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <Lock className="h-4.5 w-4.5 text-amber-400" />
          </div>

          {/* Label */}
          <div>
            <p className="text-sm font-semibold text-white/90">{label}</p>
            <p className="text-xs text-white/40 mt-0.5">Upgrade to Pro to unlock</p>
          </div>

          {/* CTA */}
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-400 px-4 py-1.5 text-xs font-semibold text-black transition-colors"
          >
            Upgrade → Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
