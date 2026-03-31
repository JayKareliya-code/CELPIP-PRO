// ─────────────────────────────────────────────────────────────────────────────
// WritingModuleHome.tsx — Page shell for the writing module home (/writing)
// ─────────────────────────────────────────────────────────────────────────────

import { BreadcrumbNav }   from "@/components/layout/BreadcrumbNav";
import { WritingTaskGrid } from "@/components/writing/WritingTaskGrid";
import { PenLine }         from "lucide-react";
import type { WritingTask } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingModuleHomeProps {
  tasks: WritingTask[];
}

/**
 * Writing module home page shell.
 * Composes BreadcrumbNav + heading + WritingTaskGrid.
 * Mirrors the structure of SpeakingModuleHome for visual/structural consistency.
 */
export function WritingModuleHome({ tasks }: WritingModuleHomeProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* Page heading */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <PenLine className="w-5 h-5 text-primary" />
          </span>
          <h1 className="text-2xl font-bold text-foreground">Writing Module</h1>
        </div>
        <p className="text-sm text-subtle max-w-lg">
          Practice both CELPIP writing tasks with timed sessions, live word counts,
          and AI-powered feedback. Each task mirrors the real exam format.
        </p>
      </div>

      {/* Task grid */}
      <WritingTaskGrid tasks={tasks} />
    </div>
  );
}
