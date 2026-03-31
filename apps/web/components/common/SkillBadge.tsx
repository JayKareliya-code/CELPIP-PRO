import { Mic, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/types";

interface SkillBadgeProps {
  skill: Skill;
  size?: "sm" | "md";
  className?: string;
}

const skillConfig = {
  speaking: {
    label: "Speaking",
    icon: Mic,
    classes: "bg-primary-light text-primary border-primary/20",
  },
  writing: {
    label: "Writing",
    icon: PenLine,
    classes: "bg-success-light text-success border-success/30",
  },
} as const;

/**
 * "Speaking" or "Writing" pill badge with matching icon and colour.
 * Keeps skill identification visually consistent across all pages.
 */
export function SkillBadge({ skill, size = "md", className }: SkillBadgeProps) {
  const { label, icon: Icon, classes } = skillConfig[skill];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        classes,
        className
      )}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {label}
    </span>
  );
}
