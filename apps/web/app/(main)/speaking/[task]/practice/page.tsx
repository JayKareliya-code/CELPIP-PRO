import { notFound }              from "next/navigation";
import { auth }                   from "@clerk/nextjs/server";
import type { Metadata }          from "next";
import { SpeakingPracticeSession } from "@/components/speaking/SpeakingPracticeSession";
import type { SpeakingTask }       from "@/lib/types";

interface PageProps { params: { task: string } }

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchTask(taskId: string, token: string | null): Promise<SpeakingTask | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/speaking/tasks/by-id/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Speaking Practice — CELPIP Prep",
    description: "Timed speaking practice: countdown, prep, and recording phases.",
  };
}

/**
 * Speaking practice session — /speaking/[task]/practice
 *
 * Server component: fetches the real task from the API using the UUID in [task].
 * Passes the full task object (with real UUID) to SpeakingPracticeSession so
 * useSpeakingAttempt can POST /speaking/attempts/start with a valid prompt_id.
 */
export default async function SpeakingPracticePage({ params }: PageProps) {
  const { getToken } = await auth();
  const token = await getToken();
  const task = await fetchTask(params.task, token);
  if (!task) notFound();

  return <SpeakingPracticeSession task={task} />;
}
