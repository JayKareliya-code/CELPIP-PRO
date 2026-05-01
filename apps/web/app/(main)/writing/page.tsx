import type { Metadata } from "next";
import { auth }          from "@clerk/nextjs/server";
import { PageWrapper }   from "@/components/layout/PageWrapper";
import { WritingModuleHome } from "@/components/writing/WritingModuleHome";
import type { WritingTask }  from "@/lib/types";

export const metadata: Metadata = {
  title: "Writing Module — CELPIPBRO",
  description:
    "Practice both CELPIP writing tasks (Email and Opinion Essay) with timed sessions, live word counts, and AI-powered feedback.",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Writing module home — server component.
 * Fetches active writing tasks from the API; falls back to empty state.
 */
export default async function WritingPage() {
  const { getToken } = await auth();
  const token = await getToken();

  let tasks: WritingTask[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/writing/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) tasks = await res.json();
  } catch {
    // Fall through — empty state rendered by WritingModuleHome
  }

  return (
    <PageWrapper>
      <WritingModuleHome tasks={tasks} />
    </PageWrapper>
  );
}
