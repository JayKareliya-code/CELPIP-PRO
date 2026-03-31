import type { Metadata }      from "next";
import { PageWrapper }        from "@/components/layout/PageWrapper";
import { WritingModuleHome }  from "@/components/writing/WritingModuleHome";
import { MOCK_WRITING_TASKS } from "@/lib/mockData";

export const metadata: Metadata = {
  title:       "Writing Module",
  description: "Practice both CELPIP writing tasks (Email and Opinion Essay) with timed sessions and detailed AI feedback.",
};

/**
 * Writing module home — /writing
 * Server component: passes mock task data; swap for API fetch on Day 10.
 */
export default function WritingPage() {
  return (
    <PageWrapper>
      <WritingModuleHome tasks={MOCK_WRITING_TASKS} />
    </PageWrapper>
  );
}

