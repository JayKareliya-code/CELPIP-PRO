import type { Metadata } from "next";
import { auth }         from "@clerk/nextjs/server";
import { PageWrapper }  from "@/components/layout/PageWrapper";
import { PracticeHub }  from "@/components/practice/PracticeHub";
import type { AppUser } from "@/lib/types";

export const metadata: Metadata = {
  title: "Practice Tests — CELPIP PRO",
  description:
    "Take timed full-length speaking and writing practice tests. Your quota depends on your plan.",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default async function PracticePage() {
  const { getToken } = await auth();
  const token = await getToken();

  let user: AppUser | null = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) user = await res.json();
  } catch {
    /* fall through — PracticeHub handles null user gracefully */
  }

  return (
    <PageWrapper>
      <PracticeHub user={user} />
    </PageWrapper>
  );
}
