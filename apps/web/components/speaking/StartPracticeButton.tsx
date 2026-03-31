import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StartPracticeButtonProps {
  taskId: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Full-width CTA button that routes to the practice session for a given task.
 * Disabled state used when task is locked (Starter plan restriction).
 */
export function StartPracticeButton({
  taskId,
  disabled = false,
  className,
}: StartPracticeButtonProps) {
  if (disabled) {
    return (
      <button
        disabled
        className={cn(
          "w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl",
          "bg-muted text-subtle border border-border cursor-not-allowed",
          "text-base font-semibold",
          className
        )}
      >
        <PlayCircle className="w-5 h-5" />
        Upgrade to Practice
      </button>
    );
  }

  return (
    <Link
      href={`/speaking/${taskId}/practice`}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl",
        "bg-primary hover:bg-primary-hover text-white transition-colors duration-150",
        "text-base font-semibold shadow-sm hover:shadow-card",
        className
      )}
    >
      <PlayCircle className="w-5 h-5" />
      Start Practice
    </Link>
  );
}
