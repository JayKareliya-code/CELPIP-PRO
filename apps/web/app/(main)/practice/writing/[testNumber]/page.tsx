// ─────────────────────────────────────────────────────────────────────────────
// /practice/writing/[testNumber] — Full CELPIP writing mock exam page.
//
// Params:
//   testNumber: "1" | "2" | … | MAX_PRACTICE_SLOTS
//   Validated against the slot range; quota gate is enforced by the
//   PracticeTestSlot component on the /practice/writing list page.
//
// Renders WritingMockExamShell — a full-screen sequential session
// (Task 1 → break → Task 2 → complete screen).
// No PageWrapper — the shell manages its own full-screen layout.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata }          from "next";
import { notFound }               from "next/navigation";
import { WritingMockExamShell }   from "@/components/writing/WritingMockExamShell";
import { MAX_PRACTICE_SLOTS }     from "@/lib/practice/config";

interface PageProps {
  params: Promise<{ testNumber: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { testNumber } = await params;
  return {
    title:       `Writing Mock Exam #${testNumber} — CELPIP PRO`,
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
    <div className="min-h-screen bg-canvas">
      <WritingMockExamShell examNumber={n} />
    </div>
  );
}
