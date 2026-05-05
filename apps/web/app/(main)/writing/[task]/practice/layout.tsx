// ─────────────────────────────────────────────────────────────────────────────
// layout.tsx — Session layout for /writing/[task]/practice
//
// Mirrors the speaking practice layout exactly:
//   - Fixed inset-0 canvas at z-[55] covers the Navbar (z-50) and Footer
//   - overflow-y-scroll so the sticky WritingSessionHeader works correctly
//   - WritingPracticeSession is the only thing visible — full focus mode
//
// Z-index stack:
//   (main) Navbar:       z-50   → covered by the canvas
//   Practice canvas:     z-[55] → covers the navbar completely
//   WritingExitButton:   z-[60] → above the canvas, always clickable
// ─────────────────────────────────────────────────────────────────────────────

import { WritingExitButton } from "@/components/writing/WritingExitButton";

export default function WritingPracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Full-screen canvas — sits above the Navbar (z-50) */}
      <div className="fixed inset-0 z-[55] bg-canvas overflow-y-scroll overscroll-none flex flex-col no-scrollbar">
        {children}
      </div>

      {/* Exit button — outside the canvas, root stacking context */}
      <WritingExitButton />
    </>
  );
}
