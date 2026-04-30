"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WelcomeBanner.tsx — Time-aware greeting with inline streak count
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useCurrentUser }      from "@/lib/hooks/useCurrentUser";

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export function WelcomeBanner() {
  const { user, isLoading } = useCurrentUser();
  const firstName           = user?.full_name?.split(" ")[0] ?? "there";
  const streak              = user?.streak_days ?? 0;

  // Hydration-safe: set neutral text on server, personalize after mount
  const [greeting, setGreeting] = useState(`Hello, ${firstName}`);

  useEffect(() => {
    setGreeting(`Good ${getTimeOfDay()}, ${firstName}`);
  }, [firstName]);

  return (
    <div className="mb-6">
      {isLoading ? (
        <div className="h-7 w-56 animate-pulse rounded bg-border" />
      ) : (
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}
          {streak > 0 && (
            <span className="ml-3 text-base font-normal text-subtle">
              🔥 {streak} day{streak !== 1 ? "s" : ""} streak
            </span>
          )}
        </h1>
      )}
      <p className="mt-1 text-sm text-subtle">
        Your CELPIP practice dashboard
      </p>
    </div>
  );
}
