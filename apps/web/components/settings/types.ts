// ─────────────────────────────────────────────────────────────────────────────
// components/settings/types.ts
// Shared types scoped to the Settings feature module.
// ─────────────:──────────────────────────────────────────────────────────────

import { CreditCard, Shield, Target, Trash2, User2 } from "lucide-react";

// ── Tab IDs ───────────────────────────────────────────────────────────────────

export type SettingsTab =
  | "profile"
  | "goal"
  | "subscription"
  | "privacy"
  | "danger";

export interface TabConfig {
  id:    SettingsTab;
  label: string;
  icon:  React.ElementType;
}

export const SETTINGS_TABS: TabConfig[] = [
  { id: "profile",      label: "Profile",        icon: User2      },
  { id: "goal",         label: "Practice Goal",  icon: Target     },
  { id: "subscription", label: "Subscription",   icon: CreditCard },
  { id: "privacy",      label: "Privacy & Data", icon: Shield     },
  { id: "danger",       label: "Danger Zone",    icon: Trash2     },
];

// ── GDPR Data Export ──────────────────────────────────────────────────────────

export type ExportStatus = "idle" | "pending" | "processing" | "complete" | "failed";

export interface ExportJob {
  job_id:        string;
  status:        ExportStatus;
  download_url:  string | null;
  expires_at:    string | null;
  error_message: string | null;
}
