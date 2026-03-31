import { Flame, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/lib/types";

interface StreakWidgetProps {
  user: AppUser;
}

/** Returns motivational copy based on current streak length. */
function getStreakCopy(days: number): string {
  if (days === 0) return "Start today to build your streak!";
  if (days < 3) return "Great start — keep the momentum going!";
  if (days < 7) return "You're on a roll. Don't break the chain!";
  if (days < 14) return "One week+ — impressive dedication!";
  return "Elite consistency. Your target band is within reach!";
}

/**
 * Streak widget — displays the user's consecutive practice day count
 * with motivational copy scaled to the streak length.
 */
export function StreakWidget({ user }: StreakWidgetProps) {
  const { streak_days, last_active_date } = user;
  const lastActive = last_active_date
    ? new Date(last_active_date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
    : "Never";

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Flame
          className={cn(
            "w-5 h-5",
            streak_days >= 7 ? "text-orange-500" : "text-warning"
          )}
        />
        <h2 className="text-base font-semibold text-foreground">Practice Streak</h2>
      </div>

      <div className="flex items-end gap-2 mb-2">
        <span
          className={cn(
            "text-5xl font-extrabold leading-none",
            streak_days >= 7 ? "text-orange-500" : "text-warning"
          )}
        >
          {streak_days}
        </span>
        <span className="text-xl font-semibold text-subtle mb-1">days</span>
      </div>

      <p className="text-sm text-subtle mb-3">{getStreakCopy(streak_days)}</p>

      <div className="flex items-center gap-1.5 text-xs text-subtle">
        <CalendarDays className="w-3.5 h-3.5" />
        Last active: {lastActive}
      </div>
    </div>
  );
}
