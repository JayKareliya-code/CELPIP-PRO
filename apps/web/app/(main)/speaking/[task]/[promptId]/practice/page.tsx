import { notFound }                from "next/navigation";
import { auth }                     from "@clerk/nextjs/server";
import type { Metadata }            from "next";
import { SpeakingPracticeSession }  from "@/components/speaking/SpeakingPracticeSession";
import type { SpeakingTask }        from "@/lib/types";

// New route: /speaking/[task]/[promptId]/practice
// [task]     = task number (0–8)
// [promptId] = UUID of the specific speaking_prompts row

interface PageProps {
  params: Promise<{ task: string; promptId: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchPromptById(
  promptId: string,
  token: string | null,
): Promise<SpeakingTask | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/speaking/tasks/by-id/${promptId}`,
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
  const taskLabel = taskNum === 0 ? "Practice Task" : `Task ${taskNum}`;
  return {
    title: `${taskLabel} — Speaking Practice | CELPIP PRO`,
    description: "Timed speaking practice: countdown, prep timer, and recording phases.",
  };
}

/**
 * Speaking practice session page — /speaking/[task]/[promptId]/practice
 *
 * Fetches the specific prompt by UUID from the backend and passes the full
 * task object to SpeakingPracticeSession so the recording hook can start.
 * This keeps the URL human-readable (task number in path) while still
 * supporting multiple prompts per task (promptId in path).
 */
export default async function SpeakingPracticePage({ params }: PageProps) {
  const { promptId } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  const task = await fetchPromptById(promptId, token);
  if (!task) notFound();

  return <SpeakingPracticeSession task={task} />;
}
