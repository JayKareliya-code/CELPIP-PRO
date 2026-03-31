"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TipsTabPanel.tsx — Tab-panel UI for speaking task tip sections
//
// Used by ALL speaking tasks (Practice + Tasks 1–8) via TaskInstructionPage.
// Only tabs that have data are rendered — no empty panels.
//
// Visual contract:
//   • Available tabs rendered as pill buttons in a flex row
//   • Active tab: solid primary fill, white text + icon
//   • Inactive tabs: ghost pill, coloured icon, hover highlight
//   • Content box: rounded-xl on ALL corners — no exceptions
//   • Zero overlap between tab row and content box (flex-col gap-2)
//   • First available tab is pre-selected on mount
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo }              from "react";
import { BookOpen, Link2, LayoutTemplate } from "lucide-react";
import { cn }                             from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface TipsTabPanelProps {
  vocabularyTips:   string[];
  connectorPhrases: string[];
  templateHint:     string;
}

// ── Tab definitions ────────────────────────────────────────────────────────────

type TabId = "vocabulary" | "connectors" | "template";

interface TabDef {
  id:        TabId;
  label:     string;
  icon:      React.ElementType;
  /** Icon colour when tab is INACTIVE */
  accentCls: string;
  /** Return false if this tab should be hidden (no data) */
  hasData:   (p: TipsTabPanelProps) => boolean;
}

const TAB_DEFINITIONS: TabDef[] = [
  {
    id:        "vocabulary",
    label:     "Key Vocabulary",
    icon:      BookOpen,
    accentCls: "text-primary",
    hasData:   (p) => p.vocabularyTips.length > 0,
  },
  {
    id:        "connectors",
    label:     "Connectors & Transitions",
    icon:      Link2,
    accentCls: "text-success",
    hasData:   (p) => p.connectorPhrases.length > 0,
  },
  {
    id:        "template",
    label:     "Response Template",
    icon:      LayoutTemplate,
    accentCls: "text-warning",
    hasData:   (p) => !!p.templateHint,
  },
];

// ── Content renderers ─────────────────────────────────────────────────────────

function VocabularyContent({ tips }: { tips: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tips.map((tip) => (
        <span
          key={tip}
          className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
        >
          {tip}
        </span>
      ))}
    </div>
  );
}

function ConnectorsContent({ phrases }: { phrases: string[] }) {
  return (
    <ol className="space-y-2">
      {phrases.map((phrase, i) => (
        <li key={phrase} className="flex items-start gap-2 text-sm text-foreground">
          <span className="text-xs font-bold text-success mt-0.5 w-4 shrink-0">
            {i + 1}.
          </span>
          <span className="font-medium">&ldquo;{phrase}&rdquo;</span>
        </li>
      ))}
    </ol>
  );
}

function TemplateContent({ hint }: { hint: string }) {
  // Split on arrow or em-dash separators (e.g. "Step A → Step B — Step C")
  const steps = hint.split(/\s*[→—]\s*/);
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-xs font-bold text-warning mt-0.5 w-5 shrink-0">
            {i + 1}.
          </span>
          <span className="text-sm text-foreground leading-snug">{step.trim()}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Uniform tips tab panel — rendered identically for every speaking task.
 *
 * Only tabs with actual content are shown. First available tab is active by default.
 * Layout:
 *
 *   [■ Key Vocabulary]  [· Connectors]  [· Response Template]   ← pill tabs
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  (content of active tab)                                 │ ← content box
 *   └──────────────────────────────────────────────────────────┘
 */
export function TipsTabPanel({
  vocabularyTips,
  connectorPhrases,
  templateHint,
}: TipsTabPanelProps) {
  const props = { vocabularyTips, connectorPhrases, templateHint };

  // Derive the available tabs once (memoised to avoid recompute on every render)
  const visibleTabs = useMemo(
    () => TAB_DEFINITIONS.filter((t) => t.hasData(props)),
    // Use the actual values, not .length proxies — if content changes but
    // length is the same, the memoised result must still update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vocabularyTips, connectorPhrases, templateHint]
  );

  // Default to first available tab
  const [activeId, setActiveId] = useState<TabId>(
    () => visibleTabs[0]?.id ?? "vocabulary"
  );

  if (visibleTabs.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">

      {/* ── Tab pill row ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Task tips">
        {visibleTabs.map(({ id, label, icon: Icon, accentCls }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tips-panel-${id}`}
              id={`tips-tab-${id}`}
              onClick={() => setActiveId(id)}
              className={cn(
                // Shape — rounded-xl on all corners, always
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold",
                "border transition-all duration-200 select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                isActive
                  ? "bg-primary border-primary text-white shadow-sm"
                  : "bg-surface border-border text-subtle hover:text-foreground hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <Icon
                className={cn(
                  "w-3.5 h-3.5 shrink-0",
                  isActive ? "text-white" : accentCls
                )}
              />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Content panel — rounded-xl all corners, no overlap ever ─────── */}
      <div
        id={`tips-panel-${activeId}`}
        role="tabpanel"
        aria-labelledby={`tips-tab-${activeId}`}
        className="rounded-xl border border-border bg-surface p-5 min-h-[96px]"
      >
        {activeId === "vocabulary" && <VocabularyContent tips={vocabularyTips}      />}
        {activeId === "connectors" && <ConnectorsContent phrases={connectorPhrases} />}
        {activeId === "template"   && <TemplateContent   hint={templateHint}        />}
      </div>

    </div>
  );
}
