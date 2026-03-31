"use client";

import { useRouter } from "next/navigation";
import { TaskCard } from "@/components/speaking/TaskCard";
import type { SpeakingTask } from "@/lib/types";

interface TaskGridProps {
  tasks: SpeakingTask[];
}

/**
 * Responsive grid of TaskCard components.
 * Client component because TaskCard's onStartClick drives router navigation.
 * Grid layout: 1-col mobile → 2-col sm → 3-col lg (per UI plan).
 */
export function TaskGrid({ tasks }: TaskGridProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          taskNumber={task.task_number}
          title={task.title}
          prepTimeSecs={task.prep_time_seconds}
          responseTimeSecs={task.response_time_seconds}
          difficulty={task.difficulty}
          hasParts={task.has_parts}
          isLocked={false} // Phase 4 will wire plan-based locking
          onStartClick={() => router.push(`/speaking/${task.id}`)}
        />
      ))}
    </div>
  );
}
