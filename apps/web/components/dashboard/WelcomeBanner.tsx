"use client";

import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import type { AppUser } from "@/lib/types";

interface WelcomeBannerProps {
  user: AppUser;
}

/** Returns "morning" | "afternoon" | "evening" based on current local hour. */
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/**
 * Dashboard greeting banner.
 *
 * Why useState + useEffect:
 *   `getTimeOfDay()` calls `new Date()` which differs between server render
 *   (UTC) and client hydration (local time), causing a React hydration warning.
 *   Initialising with a neutral string and updating in useEffect ensures the
 *   time-of-day logic only ever runs on the client.
 */
export function WelcomeBanner({ user }: WelcomeBannerProps) {
  const firstName = user.full_name.split(" ")[0];

  // Start with neutral greeting — updated client-side after mount
  const [greeting, setGreeting] = useState(`Hello, ${firstName} 👋`);

  useEffect(() => {
    setGreeting(`Good ${getTimeOfDay()}, ${firstName} 👋`);
  }, [firstName]);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
        <p className="text-sm text-subtle mt-0.5">
          Ready to practice? Every session brings you closer to your target.
        </p>
      </div>

      {/* Streak badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning-light border border-warning/30">
        <Flame className="w-4 h-4 text-warning" />
        <span className="text-sm font-semibold text-warning">
          {user.streak_days} day streak
        </span>
      </div>
    </div>
  );
}
