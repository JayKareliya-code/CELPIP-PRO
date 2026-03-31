import { notFound } from "next/navigation";
import { auth }       from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { PageWrapper }         from "@/components/layout/PageWrapper";
import { TaskInstructionPage } from "@/components/speaking/TaskInstructionPage";
import type { SpeakingTask }   from "@/lib/types";

interface PageProps { params: { task: string } }

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchTask(taskId: string, token: string | null): Promise<SpeakingTask | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/speaking/tasks/by-id/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: "Speaking Task — CELPIP Prep",
    description: "Instructions, vocabulary tips, and structural template. Start your timed practice session.",
  };
}

export default async function SpeakingTaskPage({ params }: PageProps) {
  const { getToken } = await auth();
  const token = await getToken();
  const task = await fetchTask(params.task, token);
  if (!task) notFound();

  return (
    <PageWrapper>
      <TaskInstructionPage task={task} />
    </PageWrapper>
  );
}
