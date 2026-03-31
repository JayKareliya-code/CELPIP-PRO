import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { TaskGrid } from "@/components/speaking/TaskGrid";
import { Mic } from "lucide-react";
import type { SpeakingTask } from "@/lib/types";

interface SpeakingModuleHomeProps {
  tasks: SpeakingTask[];
}

/**
 * Speaking module home page shell.
 * Renders the page heading row + breadcrumb + full task grid.
 * Pure presentational — data provided via props.
 */
export function SpeakingModuleHome({ tasks }: SpeakingModuleHomeProps) {
  return (
    <div>
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* Page heading */}
      <div className="flex items-center gap-3 mt-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
          <Mic className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Speaking Module</h1>
          <p className="text-sm text-subtle">
            9 tasks · Practice Task + Tasks 1–8 · Scored 1–12
          </p>
        </div>
      </div>

      {/* Task grid */}
      <TaskGrid tasks={tasks} />
    </div>
  );
}
