import type { Metadata } from "next";
import { PageWrapper }         from "@/components/layout/PageWrapper";
import { ProgressPageClient }  from "@/components/progress/ProgressPageClient";

export const metadata: Metadata = {
  title: "Progress — CELPIPBRO",
  description:
    "Track your CELPIP Speaking and Writing improvement. See per-task scores, trend sparklines, and rubric dimension breakdowns.",
};

/**
 * Progress page — /progress
 * Server-component shell. All data fetching and interactivity lives in
 * ProgressPageClient (client component via React Query).
 *
 * Access control:
 *   - Starter plan → upgrade gate (no individual task practice)
 *   - Pro / Ultra  → full task grid + recent feed
 *   - Ultra only   → rubric dimension breakdown panel
 */
export default function ProgressPage() {
  return (
    <PageWrapper>
      <ProgressPageClient />
    </PageWrapper>
  );
}

