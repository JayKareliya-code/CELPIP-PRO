import { Clock, Mic, Layers } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TaskMetaBadgesProps {
  prepTimeSecs: number;
  responseTimeSecs: number;
  /** True for Task 5 (Comparing and Persuading — 2 parts) */
  hasParts?: boolean;
  className?: string;
}

/**
 * Prep time + Response time pill badges for speaking task cards and instruction pages.
 * Uses outline style so they sit lightly alongside primary content.
 */
export function TaskMetaBadges({
  prepTimeSecs,
  responseTimeSecs,
  hasParts = false,
  className,
}: TaskMetaBadgesProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Prep time */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium">
        <Clock className="w-3 h-3" />
        Prep: {formatTime(prepTimeSecs)}
      </span>

      {/* Response time */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium">
        <Mic className="w-3 h-3" />
        Response: {formatTime(responseTimeSecs)}
        {hasParts && " × 2"}
      </span>

      {/* 2-parts indicator — only for Task 5 */}
      {hasParts && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-700/50 bg-amber-900/30 text-amber-300 text-xs font-medium">
          <Layers className="w-3 h-3" />
          2 parts
        </span>
      )}
    </div>
  );
}
