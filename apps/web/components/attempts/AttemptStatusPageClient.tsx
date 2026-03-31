// ─────────────────────────────────────────────────────────────────────────────
// AttemptStatusPageClient.tsx — Client-side polling wrapper for status page
//
// Owns the useAttemptStatus hook call. Renders AttemptStatusCard with live
// attempt data as the status transitions processing → complete.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useAttemptStatus } from "@/lib/hooks/useAttemptStatus";
import { AttemptStatusCard } from "@/components/attempts/AttemptStatusCard";

// ── Props ─────────────────────────────────────────────────────────────────────

interface AttemptStatusPageClientProps {
  attemptId: string;
}

/**
 * Client-side wrapper that wires useAttemptStatus into AttemptStatusCard.
 * Kept separate from page.tsx so the page itself remains a server component.
 */
export function AttemptStatusPageClient({ attemptId }: AttemptStatusPageClientProps) {
  const { attempt, isLoading, isError } = useAttemptStatus(attemptId);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        {/* Progress indicator dots — animation-delay-* classes defined in globals.css */}
        <div className="flex justify-center gap-1.5 mb-6" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse animation-delay-150" />
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse animation-delay-300" />
        </div>

        <AttemptStatusCard
          attempt={attempt}
          isLoading={isLoading}
          isError={isError}
        />

        {/* Reassurance copy */}
        <p className="text-center text-xs text-subtle">
          This page updates automatically — no need to refresh.
        </p>
      </div>
    </div>
  );
}
