import { notFound }                from "next/navigation";
import type { Metadata }            from "next";
import { WritingPracticeSession }  from "@/components/writing/WritingPracticeSession";
import { MOCK_WRITING_TASKS }       from "@/lib/mockData";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { task: string };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export function generateMetadata({ params }: PageProps): Metadata {
  const task = MOCK_WRITING_TASKS.find((t) => t.id === params.task);
  const title = task
    ? `Practice — Task ${task.task_number}: ${task.title}`
    : "Writing Practice";
  return {
    title,
    description: `Timed writing session for ${title}. Compose your response, track your word count, and submit before time runs out.`,
  };
}

/**
 * Writing practice session page — /writing/[task]/practice
 *
 * Server component: resolves the task from mock data (swap for API on Day 10),
 * then hands off to WritingPracticeSession which is a "use client" component.
 *
 * No PageWrapper here — WritingPracticeSession renders full-screen focus mode
 * with its own layout (sticky header bar, no navbar/sidebar visible).
 */
export default function WritingPracticePage({ params }: PageProps) {
  const task = MOCK_WRITING_TASKS.find((t) => t.id === params.task);
  if (!task) notFound();

  return <WritingPracticeSession task={task} />;
}
