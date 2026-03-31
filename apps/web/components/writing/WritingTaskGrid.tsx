// ─────────────────────────────────────────────────────────────────────────────
// WritingTaskGrid.tsx — 2-card responsive grid of WritingTaskCard components
// ─────────────────────────────────────────────────────────────────────────────

import { WritingTaskCard } from "@/components/writing/WritingTaskCard";
import type { WritingTask } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingTaskGridProps {
  tasks: WritingTask[];
}

/**
 * Renders the two writing task cards (Task 1 + Task 2) in a responsive grid.
 *
 * Grid spec (from plan): grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl
 * Centred max-width so the two cards don't stretch across a full 1440px viewport.
 */
export function WritingTaskGrid({ tasks }: WritingTaskGridProps) {
  if (!tasks.length) {
    return (
      <p className="text-subtle text-sm">No writing tasks available.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl animate-fade-in">
      {tasks.map((task) => (
        <WritingTaskCard
          key={task.id}
          task={task}
          // Lock writing tasks for starter plan users is handled by parent
          // via plan context — hardcoded to unlocked for Phase 1 mock browsing
          isLocked={false}
        />
      ))}
    </div>
  );
}
