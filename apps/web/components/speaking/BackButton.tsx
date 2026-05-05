"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BackButton.tsx — Fixed top-left back arrow for practice session screens
//
// Rendered directly by the practice layout (not inside SpeakingPracticeSession)
// so it sits in the root stacking context and is always visible.
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="fixed top-4 left-4 z-[60] flex items-center gap-2 px-3 py-2 rounded-lg
                 bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] hover:border-white/30
                 text-white/70 hover:text-white text-sm font-medium backdrop-blur-sm
                 transition-all duration-150"
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
  );
}
