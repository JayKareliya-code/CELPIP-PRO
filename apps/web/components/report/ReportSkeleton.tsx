"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReportSkeleton.tsx — Loading skeleton shown while the report is fetching
// ─────────────────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-border/60 ${className ?? ""}`} />
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Score card skeleton */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <Skeleton className="h-36 w-36 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-9 w-48 mt-2" />
          </div>
        </div>
      </div>

      {/* Dimension bars skeleton */}
      <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <Skeleton className="h-4 w-36" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>

      {/* Feedback panels skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-10 w-full" />)}
          </div>
        ))}
      </div>

      {/* Accordion skeleton */}
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  );
}
