// ─────────────────────────────────────────────────────────────────────────────
// layout.tsx — Session layout for /writing/[task]/[promptId]/practice
//
// Identical to /writing/[task]/practice/layout.tsx
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
