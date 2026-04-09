// ─────────────────────────────────────────────────────────────────────────────
// shared/inputCls.ts — Single source of truth for admin form input styling.
//
// Import this in any admin form component instead of re-declaring the
// className string locally. Keeps all admin inputs visually consistent and
// makes theme changes a one-line edit.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

/**
 * Base Tailwind class string for every text input, select, and textarea in
 * the admin panel. Use `cn(inputCls, "extra-class")` when you need overrides.
 */
export const inputCls = cn(
  "w-full rounded-lg border border-border bg-muted px-3 py-2",
  "text-sm text-foreground placeholder:text-subtle/60",
  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
  "transition-colors duration-150",
);
