import { Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttemptStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: AttemptStatus;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<
  AttemptStatus,
  { label: string; icon: React.ElementType; classes: string; spin?: boolean }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    classes: "bg-muted text-subtle border-border",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    classes: "bg-warning-light text-warning border-warning/30",
    spin: true,
  },
  complete: {
    label: "Complete",
    icon: CheckCircle2,
    classes: "bg-success-light text-success border-success/30",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    classes: "bg-danger-light text-danger border-danger/30",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    classes: "bg-muted text-subtle border-border",
  },
};

/**
 * Attempt status pill — pending / processing / complete / failed.
 * "processing" spins its icon to communicate activity.
 */
export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const { label, icon: Icon, classes, spin } = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        classes,
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5", spin && "animate-spin")} />
      {label}
    </span>
  );
}
