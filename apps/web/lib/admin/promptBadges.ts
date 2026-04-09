// ─────────────────────────────────────────────────────────────────────────────
// lib/admin/promptBadges.ts
// Shared badge colour maps for admin prompt tables (speaking + writing).
// ─────────────────────────────────────────────────────────────────────────────

export const DIFFICULTY_STYLES: Record<string, string> = {
  easy:   "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  hard:   "bg-danger/10  text-danger  border-danger/20",
};

export const STATUS_STYLES: Record<string, string> = {
  published: "bg-success/10 text-success border-success/20",
  draft:     "bg-warning/10 text-warning border-warning/20",
  archived:  "bg-muted      text-subtle  border-border",
};
