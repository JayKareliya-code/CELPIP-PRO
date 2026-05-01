// ─────────────────────────────────────────────────────────────────────────────
// /writing/[task]/instruction — Full instruction layout for a writing task.
//
// Shows the prompt, meta badges, idea hints, intro/conclusion templates,
// and the "Start Writing" CTA → /writing/[task]/practice
// ─────────────────────────────────────────────────────────────────────────────

import { notFound }                 from "next/navigation";
import { auth }                     from "@clerk/nextjs/server";
import type { Metadata }            from "next";
import { PageWrapper }              from "@/components/layout/PageWrapper";
import { WritingInstructionPage }   from "@/components/writing/WritingInstructionPage";
import type { WritingTask }         from "@/lib/types";

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
    title: `Instructions — ${label} | CELPIPBRO`,
    description: `Review the prompt and structural hints for ${label}, then start your timed writing session.`,
  };
}

export default async function WritingInstructionRoute({ params }: PageProps) {
  const { task: taskId } = await params;

  const { getToken } = await auth();
  const token = await getToken();

  const allTasks = await fetchAllWritingTasks(token);
  const task = allTasks.find((t) => t.id === taskId) ?? null;
  if (!task) notFound();

  return (
    <PageWrapper>
      <WritingInstructionPage task={task} />
    </PageWrapper>
  );
}
