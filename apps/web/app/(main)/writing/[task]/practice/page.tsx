// ─────────────────────────────────────────────────────────────────────────────
// /writing/[task]/practice — Timed writing practice session.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound }               from "next/navigation";
import { auth }                   from "@clerk/nextjs/server";
import type { Metadata }          from "next";
import { WritingPracticeSession } from "@/components/writing/WritingPracticeSession";
import type { WritingTask }       from "@/lib/types";

interface PageProps {
  params: Promise<{ task: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchAllWritingTasks(token: string | null): Promise<WritingTask[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/writing/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { task: taskId } = await params;
  const label = taskId.includes("1") ? "Task 1 — Writing an Email" : "Task 2 — Opinion Essay";
  return {
    title: `Practice — ${label} | CELPIPBRO`,
    description: `Timed writing session for ${label}. Compose your response, track your word count, and submit before time runs out.`,
  };
}

/**
 * Writing practice session page — /writing/[task]/practice
 *
 * No PageWrapper — WritingPracticeSession renders full-screen focus mode
 * with its own layout (sticky header bar, no navbar visible).
 */
export default async function WritingPracticePage({ params }: PageProps) {
  const { task: taskId } = await params;

  const { getToken } = await auth();
  const token = await getToken();

  const allTasks = await fetchAllWritingTasks(token);
  const task = allTasks.find((t) => t.id === taskId) ?? null;
  if (!task) notFound();

  return <WritingPracticeSession task={task} />;
}
