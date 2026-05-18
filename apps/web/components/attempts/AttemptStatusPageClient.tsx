// ─────────────────────────────────────────────────────────────────────────────
// AttemptStatusPageClient.tsx — Client-side polling wrapper for status page
//
// Shows the polished ProcessingScreen while the attempt is being scored, then
// auto-redirects to /attempts/[id]/report the moment scoring completes. A
// dedicated FailedView is rendered if scoring errors out.
//
// One visual state per phase — no intermediate "Analysis complete!" card with
// a "View Full Report" button. The score lives on the report page; that's
// where the user lands.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect }          from "react";
import { useRouter }          from "next/navigation";
import { useQueryClient }     from "@tanstack/react-query";
import { AlertCircle }        from "lucide-react";
import Link                    from "next/link";
import { useAttemptStatus }   from "@/lib/hooks/useAttemptStatus";
import { ProcessingScreen }   from "@/components/common/ProcessingScreen";

// ── Props ─────────────────────────────────────────────────────────────────────

interface AttemptStatusPageClientProps {
  attemptId: string;
}

// ── Failed view ───────────────────────────────────────────────────────────────

function FailedView({ skill }: { skill: "speaking" | "writing" }) {
  const backHref = skill === "writing" ? "/writing" : "/speaking";
  const backLabel = skill === "writing" ? "Back to Writing Tasks" : "Back to Speaking Tasks";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-5 max-w-md text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-9 h-9 text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Scoring failed</h2>
          <p className="text-sm text-subtle leading-relaxed">
            Something went wrong while analysing your response. Please try the
            attempt again — your quota was not consumed.
          </p>
        </div>
        <Link
          href={backHref}
          className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium
                     text-foreground hover:bg-muted transition-colors"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Polls attempt status; renders ProcessingScreen until complete, then auto-
 * navigates to the report page. Renders FailedView on permanent failure.
 */
export function AttemptStatusPageClient({ attemptId }: AttemptStatusPageClientProps) {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { attempt, isComplete, isFailed } = useAttemptStatus(attemptId);

  // Pick the skill for the loading copy. Default to "writing" before the first
  // poll returns — the wording is generic enough that the brief flash is fine.
  const skill = (attempt?.skill ?? "writing") as "speaking" | "writing";

  // When scoring completes, invalidate quotas and replace history with the
  // report URL so the user can't hit Back into the empty status page.
  useEffect(() => {
    if (!isComplete) return;
    queryClient.invalidateQueries({ queryKey: ["quota"] });
    queryClient.invalidateQueries({ queryKey: ["practiceQuota"] });
    router.replace(`/attempts/${attemptId}/report`);
  }, [isComplete, attemptId, queryClient, router]);

  if (isFailed) {
    return <FailedView skill={skill} />;
  }

  // Default: processing (or pre-first-poll). Render the polished screen used
  // by the submit flow so the UX is continuous from submit → score.
  return <ProcessingScreen skill={skill} className="flex-1" />;
}
