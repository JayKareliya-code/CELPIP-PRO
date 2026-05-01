import type { Metadata } from "next";
import { auth }         from "@clerk/nextjs/server";
import { PageWrapper }  from "@/components/layout/PageWrapper";
import { SpeakingModuleHome } from "@/components/speaking/SpeakingModuleHome";
import type { SpeakingTask }  from "@/lib/types";

export const metadata: Metadata = {
  title: "Speaking Module — CELPIPBRO",
  description:
    "Practice all 9 CELPIP speaking tasks. Each task has multiple prompts — earn a new prompt with every attempt up to your plan limit. Unlimited free retries after.",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Speaking module home — server component.
 *
 * Fetches ALL active speaking prompts (may be many per task_number).
 * SpeakingModuleHome groups them by task_number to display per-task prompt counts.
 */
export default async function SpeakingPage() {
  const { getToken } = await auth();
  const token = await getToken();

  let tasks: SpeakingTask[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/speaking/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) tasks = await res.json();
  } catch {
    // Fall through — empty state rendered by SpeakingModuleHome
  }

  return (
    <PageWrapper>
      <SpeakingModuleHome tasks={tasks} />
    </PageWrapper>
  );
}
