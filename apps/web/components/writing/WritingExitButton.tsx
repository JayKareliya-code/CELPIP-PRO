"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingExitButton — Simple back button for writing PRACTICE sessions.
//
// Rendered directly by layout.tsx OUTSIDE the fixed-canvas div so it sits
// above the canvas (z-[60]).
//
// For practice routes, router.back() is safe — the useWritingAttempt hook
// persists the draft to sessionStorage and cleans up timers on unmount.
//
// For the MOCK EXAM, use WritingMockExamExitGuard instead — it co-locates
// the exit button with a ConfirmModal in the root stacking context, avoiding
// the Radix aria-hidden/z-index conflicts that occur when the modal is inside
// the z-[55] canvas stacking context.
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function WritingExitButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="fixed top-4 left-4 z-[60] flex items-center gap-2 px-3 py-2
                 rounded-lg bg-white/[0.08] hover:bg-white/[0.15]
                 border border-white/[0.15] hover:border-white/30
                 text-white/70 hover:text-white text-sm font-medium
                 backdrop-blur-sm transition-all duration-150"
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
  );
}
