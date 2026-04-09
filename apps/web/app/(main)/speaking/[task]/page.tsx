// ─────────────────────────────────────────────────────────────────────────────
// /speaking/[task] — Task "folder" page.
//
// Shows all available prompts for a specific task number.
// Clicking a prompt card routes to its full-screen practice session.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound }        from "next/navigation";
import { auth }            from "@clerk/nextjs/server";
import type { Metadata }   from "next";
import { PageWrapper }     from "@/components/layout/PageWrapper";
import { TaskPromptsFolder } from "@/components/speaking/TaskPromptsFolder";
import type { SpeakingTask } from "@/lib/types";
import { SPEAKING_TASK_NAMES } from "@/lib/constants";

interface PageProps {
  params: Promise<{ task: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchPromptsForTask(
  taskNumber: number,
  token: string | null,
): Promise<SpeakingTask[]> {
  try {
    // Fetch all tasks then filter — or use the by-task-number endpoint which
    // currently returns one prompt. We fetch all and filter client-side, so
    // multiple prompts per task are all returned correctly.
    const res = await fetch(`${API_BASE}/api/v1/speaking/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const all: SpeakingTask[] = await res.json();
    return all.filter((t) => t.task_number === taskNumber);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { task } = await params;
  const taskNum = Number(task);
  const taskKey = taskNum === 0 ? "practice" : `task-${taskNum}`;
  const taskName = SPEAKING_TASK_NAMES[taskKey] ?? `Task ${taskNum}`;
  return {
    title: `${taskName} — Speaking | CELPIP PRO`,
    description: `Choose a prompt for ${taskName} and start your timed speaking practice session.`,
  };
}

export default async function SpeakingTaskFolderPage({ params }: PageProps) {
  const { task } = await params;
  const taskNumber = Number(task);

  // Validate task number is 0–8
  if (!Number.isInteger(taskNumber) || taskNumber < 0 || taskNumber > 8) {
    notFound();
  }

  const { getToken } = await auth();
  const token = await getToken();
  const prompts = await fetchPromptsForTask(taskNumber, token);

  return (
    <PageWrapper>
      <TaskPromptsFolder taskNumber={taskNumber} prompts={prompts} />
    </PageWrapper>
  );
}
