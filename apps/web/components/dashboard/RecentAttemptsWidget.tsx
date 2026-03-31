// ─────────────────────────────────────────────────────────────────────────────
// RecentAttemptsWidget.tsx — Dashboard widget showing last 3 attempts
//
// Phase 2: "View" link added for complete attempts → routes to /attempts/[id]/report
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkillBadge }    from "@/components/common/SkillBadge";
import { ScoreBadge }    from "@/components/common/ScoreBadge";
import { StatusBadge }   from "@/components/common/StatusBadge";
import { timeAgo }       from "@/lib/utils";
import type { Attempt }  from "@/lib/types";

interface RecentAttemptsWidgetProps {
  attempts: Attempt[];
}

/**
 * Dashboard widget — shows the last 3 attempts in a compact table.
 * Receives attempts as props (data sourced from mock or API in parent).
 * Phase 2: "View" link in the Action column deep-links to the full report.
 */
export function RecentAttemptsWidget({ attempts }: RecentAttemptsWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-card p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">
          Recent Attempts
        </h2>
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {attempts.length === 0 ? (
        <p className="text-sm text-subtle text-center py-8">
          No attempts yet — start your first practice session above.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Skill</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.slice(0, 3).map((attempt) => (
              <TableRow key={attempt.id} className="group">
                <TableCell>
                  <SkillBadge skill={attempt.skill} size="sm" />
                </TableCell>
                <TableCell className="text-sm font-medium text-foreground">
                  {attempt.task_title}
                </TableCell>
                <TableCell className="text-sm text-subtle">
                  {timeAgo(attempt.created_at)}
                </TableCell>
                <TableCell>
                  <ScoreBadge band={attempt.estimated_band} size="sm" />
                </TableCell>
                <TableCell>
                  <StatusBadge status={attempt.status} size="sm" />
                </TableCell>
                {/* Phase 2: View Report link — visible only when complete */}
                <TableCell className="text-right">
                  {attempt.status === "complete" ? (
                    <Link
                      href={`/attempts/${attempt.id}/report`}
                      className="inline-flex items-center gap-1 text-xs text-primary
                                 hover:underline font-medium group-hover:text-primary-hover
                                 transition-colors"
                      aria-label={`View report for ${attempt.task_title}`}
                    >
                      View
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-subtle text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
