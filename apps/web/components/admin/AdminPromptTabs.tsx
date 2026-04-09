// ─────────────────────────────────────────────────────────────────────────────
// AdminPromptTabs.tsx — Speaking | Writing prompt tab switcher
//
// Each table is now self-fetching via React Query hooks — no props needed.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState }            from "react";
import { Mic, PenLine }        from "lucide-react";
import { SpeakingTaskGrid }    from "@/components/admin/SpeakingTaskGrid";
import { WritingPromptTable }  from "@/components/admin/WritingPromptTable";
import { cn }                  from "@/lib/utils";

type ActiveTab = "speaking" | "writing";

const TABS = [
  { id: "speaking" as const, label: "Speaking", icon: Mic     },
  { id: "writing"  as const, label: "Writing",  icon: PenLine },
] as const;

/** Tabbed view for Speaking / Writing prompt management. No props needed. */
export function AdminPromptTabs() {
  const [active, setActive] = useState<ActiveTab>("speaking");

  return (
    <div className="w-full space-y-6">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Prompt type"
        className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 w-fit shadow-card"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              id={`prompts-tab-${id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`prompts-panel-${id}`}
              onClick={() => setActive(id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold",
                "transition-all duration-150 select-none",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-subtle hover:text-foreground hover:bg-muted",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab panels — tables are self-contained, fetch their own data */}
      <div
        id="prompts-panel-speaking"
        role="tabpanel"
        aria-labelledby="prompts-tab-speaking"
        hidden={active !== "speaking"}
      >
        {active === "speaking" && <SpeakingTaskGrid />}
      </div>

      <div
        id="prompts-panel-writing"
        role="tabpanel"
        aria-labelledby="prompts-tab-writing"
        hidden={active !== "writing"}
      >
        {active === "writing" && <WritingPromptTable />}
      </div>
    </div>
  );
}
