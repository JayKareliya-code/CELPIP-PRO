import type { Metadata }    from "next";
import { auth }              from "@clerk/nextjs/server";
import { notFound }          from "next/navigation";
import { PageWrapper }       from "@/components/layout/PageWrapper";
import { PracticeTestList }  from "@/components/practice/PracticeTestList";
import type { AppUser }      from "@/lib/types";

// /practice/[skill] — "speaking" | "writing"
interface PageProps {
  params: Promise<{ skill: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { skill } = await params;
  const label = skill === "speaking" ? "Speaking" : "Writing";
  return {
    title: `${label} Practice Tests — CELPIPBro`,
    description: `Choose a full-length ${label.toLowerCase()} practice test based on your plan.`,
  };
}

export default async function PracticeSkillPage({ params }: PageProps) {
  const { skill } = await params;
  if (skill !== "speaking" && skill !== "writing") notFound();

  const { getToken } = await auth();
  const token = await getToken();

  let user: AppUser | null = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) user = await res.json();
  } catch { /* fall through */ }

  return (
    <PageWrapper>
      <PracticeTestList skill={skill as "speaking" | "writing"} user={user} />
    </PageWrapper>
  );
}
