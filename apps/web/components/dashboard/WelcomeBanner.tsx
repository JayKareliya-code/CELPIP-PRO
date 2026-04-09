"use client";

import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/** Returns "morning" | "afternoon" | "evening" based on current local hour. */
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/**
 * Dashboard greeting banner — self-fetches user data via useCurrentUser.
 * Shows a personalised time-of-day greeting and the live streak count.
 */
export function WelcomeBanner() {
  const { user, isLoading } = useCurrentUser();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  // Neutral greeting during SSR/hydration; updated client-side after mount
  const [greeting, setGreeting] = useState(`Hello, ${firstName} 👋`);

  useEffect(() => {
    setGreeting(`Good ${getTimeOfDay()}, ${firstName} 👋`);
  }, [firstName]);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isLoading ? (
            <span className="inline-block h-7 w-48 bg-muted rounded animate-pulse" />
          ) : (
            greeting
          )}
        </h1>
        <p className="text-sm text-subtle mt-0.5">
          Ready to practice? Every session brings you closer to your target.
        </p>
      </div>

      {/* Streak badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning-light border border-warning/30">
        <Flame className="w-4 h-4 text-warning" />
        <span className="text-sm font-semibold text-warning">
          {isLoading ? "…" : `${user?.streak_days ?? 0} day streak`}
        </span>
      </div>
    </div>
  );
}
