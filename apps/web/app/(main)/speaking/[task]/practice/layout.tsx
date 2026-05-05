// ─────────────────────────────────────────────────────────────────────────────
// layout.tsx — Session layout for /speaking/[task]/practice
//
// This layout creates a TRUE full-screen practice canvas that sits ABOVE
// the (main) layout's Navbar (z-50). The canvas covers the entire viewport
// so the TaskContextStrip is the only top bar visible — no navbar bleed.
//
// Z-index stack:
//   (main) Navbar:     z-50  → covered by the canvas
//   Practice canvas:   z-[55] → covers the navbar
//   BackButton:        z-[60] → above the canvas, always clickable
//
// The canvas uses `overflow-auto flex flex-col` so:
//   - TaskContextStrip (sticky top-0) sticks at the top when content scrolls
//   - Content fills the remaining space with flex-1
// ─────────────────────────────────────────────────────────────────────────────

import { BackButton } from "@/components/speaking/BackButton";

export default function PracticeLayout({
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

      {/* Back button — sits above the canvas */}
      <BackButton />
    </>
  );
}
