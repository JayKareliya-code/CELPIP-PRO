// ─────────────────────────────────────────────────────────────────────────────
// /mock-test/speaking/[testNumber] — Full CELPIP speaking mock exam page.
//
// Params:
//   testNumber: "1" | "2" | … | MAX_PRACTICE_SLOTS
//   Validated against the user's plan quota (future Phase 2).
//   Currently renders the exam shell regardless of quota — quota gate is
//   enforced by the PracticeTestSlot component (locked when beyond plan limit).
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata }   from "next";
import { notFound }        from "next/navigation";
import { MockExamShell }   from "@/components/exam/MockExamShell";
import { MAX_PRACTICE_SLOTS } from "@/lib/practice/config";

interface PageProps {
  params: Promise<{ testNumber: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { testNumber } = await params;
  return {
    title:       `Speaking Mock Exam #${testNumber} — CELPIPBRO`,
    description: `Full CELPIP speaking mock exam — all 8 tasks timed, recorded, and AI-scored.`,
  };
}

export default async function MockExamPage({ params }: PageProps) {
  const { testNumber } = await params;
  const n = parseInt(testNumber, 10);

  // Validate: must be a positive integer within the max slot range
  if (isNaN(n) || n < 1 || n > MAX_PRACTICE_SLOTS) {
    notFound();
  }

  // MockExamShell is a client component — it owns all data fetching and state.
  // We intentionally keep this page minimal (no server-side data) so it stays
  // fast and doesn't block on auth during the page load.
  return (
    // Full-screen canvas — sits above the site Navbar (z-50) so the exam
    // bar is always visible without the navbar interfering.
    <div className="fixed inset-0 z-[55] bg-canvas overflow-y-scroll overscroll-none flex flex-col no-scrollbar">
      <MockExamShell slotNumber={n} />
    </div>
  );
}
