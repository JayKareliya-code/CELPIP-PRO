"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { SPEAKING_TASK_NAMES } from "@/lib/constants";


// Derive task labels from constants (single source of truth)
const SEGMENT_LABELS: Record<string, string> = {
  speaking:    "Speaking",
  writing:     "Writing",
  dashboard:   "Dashboard",
  history:     "History",
  progress:    "Progress",
  billing:     "Billing",
  admin:       "Admin",
  prompts:     "Prompts",
  calibration: "Calibration",
  "mock-test": "Mock Tests",
  instruction: "Instructions",
  tips:        "Tips & Vocabulary",
  status:      "Processing",
  report:      "Report",
  attempts:    "Attempts",
  // Writing-specific task IDs (mock data)
  "writing-task-1": "Task 1 — Writing an Email",
  "writing-task-2": "Task 2 — Opinion Essay",
  ...SPEAKING_TASK_NAMES,   // e.g. "task-1" → "Task 1 — Giving Advice"
};


/**
 * Auto-generates breadcrumbs from the current URL path segments.
 * e.g. /speaking/task-1/practice → Dashboard > Speaking > Task 1 — Giving Advice > Practice
 */
export function BreadcrumbNav() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: SEGMENT_LABELS[seg] ?? seg.replace(/-/g, " "),
    href:  "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-subtle mb-4">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map(({ label, href, isLast }) => (
        <span key={href} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-border" />
          {isLast ? (
            <span className="text-foreground font-medium capitalize">{label}</span>
          ) : (
            <Link
              href={href}
              className="hover:text-foreground transition-colors capitalize truncate max-w-[12rem]"
            >
              {label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
