// ─────────────────────────────────────────────────────────────────────────────
// /writing/[task]/[promptId]/practice — Timed writing practice session.
//
// [task]     = task_number (1 or 2)
// [promptId] = UUID of the specific writing_prompts row
//
// Mirrors /speaking/[task]/[promptId]/practice exactly.
// No PageWrapper — WritingPracticeSession is full-screen focus mode.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound }               from "next/navigation";
import { auth }                   from "@clerk/nextjs/server";
import type { Metadata }          from "next";
import { WritingPracticeSession } from "@/components/writing/WritingPracticeSession";
import type { WritingTask }       from "@/lib/types";

interface PageProps {
  params: Promise<{ task: string; promptId: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchPromptById(
  promptId: string,
  token: string | null,
): Promise<WritingTask | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/writing/tasks/by-id/${promptId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { task } = await params;
  const taskNum = Number(task);
  const label = taskNum === 1 ? "Task 1 — Writing an Email" : "Task 2 — Opinion Essay";
  return {
    title: `Practice — ${label} | CELPIPBRO`,
    description: `Timed writing session for ${label}. Compose your response, track your word count, and submit before time runs out.`,
  };
}

export default async function WritingPracticePage({ params }: PageProps) {
  const { promptId } = await params;

  const { getToken } = await auth();
  const token = await getToken();

  const task = await fetchPromptById(promptId, token);
  if (!task) notFound();

  return <WritingPracticeSession task={task} />;
}
