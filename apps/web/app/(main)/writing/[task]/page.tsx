import { notFound }             from "next/navigation";
import type { Metadata }         from "next";
import { PageWrapper }           from "@/components/layout/PageWrapper";
import { WritingInstructionPage } from "@/components/writing/WritingInstructionPage";
import { MOCK_WRITING_TASKS }    from "@/lib/mockData";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { task: string };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export function generateMetadata({ params }: PageProps): Metadata {
  const task = MOCK_WRITING_TASKS.find((t) => t.id === params.task);
  const title = task ? `Task ${task.task_number} — ${task.title}` : "Writing Task";
  return {
    title,
    description: `Instructions, idea hints, and structural templates for ${title}. Start your timed writing session.`,
  };
}

/**
 * Writing task instruction page — /writing/[task]
 * Server component: resolves task from mock data, 404s on unknown IDs.
 */
export default function WritingTaskPage({ params }: PageProps) {
  const task = MOCK_WRITING_TASKS.find((t) => t.id === params.task);
  if (!task) notFound();

  return (
    <PageWrapper>
      <WritingInstructionPage task={task} />
    </PageWrapper>
  );
}
