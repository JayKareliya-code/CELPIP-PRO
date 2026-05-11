// ─────────────────────────────────────────────────────────────────────────────
// /mock-test/writing/[testNumber] — Full CELPIP writing mock exam page.
//
// Params:
//   testNumber: "1" | "2" | … | MAX_PRACTICE_SLOTS
//   Validated against the slot range; quota gate is enforced by the
//   PracticeTestSlot component on the /mock-test/writing list page.
//
// Renders WritingMockExamShell — a full-screen sequential session
// (Task 1 → break → Task 2 → complete screen).
// No PageWrapper — the shell manages its own full-screen layout.
//
// Z-index stack:
//   Navbar:                  z-50   → covered by the canvas
//   Canvas:                  z-[55] → covers the navbar completely
//   WritingMockExamExitGuard z-[60] → exit button + ConfirmModal in root context
//
// The exit guard is rendered OUTSIDE the canvas so the Radix Dialog portal
// doesn't conflict with the z-[55] stacking context, and the focused exit
// button is never caught by Radix's aria-hidden backdrop sweep.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata }            from "next";
import { notFound }                 from "next/navigation";
import { WritingMockExamShell }     from "@/components/writing/WritingMockExamShell";
import { WritingMockExamExitGuard } from "@/components/writing/WritingMockExamExitGuard";
import { MAX_PRACTICE_SLOTS }       from "@/lib/practice/config";

interface PageProps {
  params: Promise<{ testNumber: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { testNumber } = await params;
  return {
    title:       `Writing Mock Exam #${testNumber} — CELPIPBRO`,
    description: `Full CELPIP writing mock exam — Task 1 (Email) and Task 2 (Opinion Essay), timed and AI-scored.`,
  };
}

export default async function WritingMockExamPage({ params }: PageProps) {
  const { testNumber } = await params;
  const n = parseInt(testNumber, 10);

  // Validate: must be a positive integer within the max slot range
  if (isNaN(n) || n < 1 || n > MAX_PRACTICE_SLOTS) {
    notFound();
  }

  return (
    <>
      {/* Full-screen canvas — covers Navbar (z-50) and Footer */}
      <div className="fixed inset-0 z-[55] bg-canvas overflow-y-scroll overscroll-none flex flex-col no-scrollbar">
        <WritingMockExamShell examNumber={n} />
      </div>

      {/* Exit guard — outside the canvas so both the button and the Radix
          Dialog portal are in the root stacking context. No aria-hidden
          conflict, no z-index conflict with the canvas. */}
      <WritingMockExamExitGuard />
    </>
  );
}
