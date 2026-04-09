"use client";

import { Flame, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/** Returns motivational copy based on current streak length. */
function getStreakCopy(days: number): string {
  if (days === 0) return "Start today to build your streak!";
  if (days < 3)  return "Great start — keep the momentum going!";
  if (days < 7)  return "You're on a roll. Don't break the chain!";
  if (days < 14) return "One week+ — impressive dedication!";
  return "Elite consistency. Your target band is within reach!";
}

/**
 * Streak widget — shows live streak_days and last_active_date from the API.
 * Self-fetches user data via the shared useCurrentUser hook.
 */
export function StreakWidget() {
  const { user, isLoading } = useCurrentUser();

  const streak_days     = user?.streak_days ?? 0;
  const last_active_date = user?.last_active_date ?? null;

  const lastActive = last_active_date
    ? new Date(last_active_date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
    : "Never";

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface shadow-card p-5 animate-pulse">
        <div className="h-4 w-28 bg-muted rounded mb-3" />
        <div className="h-12 w-20 bg-muted rounded mb-2" />
        <div className="h-3 w-40 bg-muted rounded" />
      </div>
    );
  }

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
