// ─────────────────────────────────────────────────────────────────────────────
// /writing/[task] — Writing task "folder" page.
//
// [task] param = task_number (1 or 2), mirrors /speaking/[task].
//
// Fetches ALL active writing prompts for this task_number and passes them
// to WritingTaskPromptsFolder which renders a grid — one card per prompt.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound }                    from "next/navigation";
import { auth }                        from "@clerk/nextjs/server";
import type { Metadata }               from "next";
import { PageWrapper }                 from "@/components/layout/PageWrapper";
import { WritingTaskPromptsFolder }    from "@/components/writing/WritingTaskPromptsFolder";
import type { WritingTask }            from "@/lib/types";

interface PageProps {
  params: Promise<{ task: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchPromptsForTask(
  taskNumber: number,
  token: string | null,
): Promise<WritingTask[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/writing/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const all: WritingTask[] = await res.json();
    // Filter to only prompts for this task number
    return all.filter((t) => t.task_number === taskNumber);
  } catch {
    return [];
  }
}

// ── Labels ────────────────────────────────────────────────────────────────────

const TASK_LABELS: Record<number, string> = {
  1: "Task 1 — Writing an Email",
  2: "Task 2 — Writing an Opinion Essay",
};

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { task } = await params;
  const taskNumber = Number(task);
  const label = TASK_LABELS[taskNumber] ?? `Writing Task ${taskNumber}`;
  return {
    title: `${label} — Writing | CELPIP PRO`,
    description: `Choose a prompt for ${label} and start your timed writing session.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WritingTaskFolderPage({ params }: PageProps) {
  const { task } = await params;
  const taskNumber = Number(task);

  // Validate — only Task 1 and Task 2 exist in CELPIP Writing
  if (!Number.isInteger(taskNumber) || taskNumber < 1 || taskNumber > 2) {
    notFound();
  }

  const { getToken } = await auth();
  const token = await getToken();

  // Fetch ALL prompts for this task number (may be many)
  const prompts = await fetchPromptsForTask(taskNumber, token);

  return (
    <PageWrapper>
      <WritingTaskPromptsFolder
        taskNumber={taskNumber as 1 | 2}
        prompts={prompts}
      />
    </PageWrapper>
  );
}
