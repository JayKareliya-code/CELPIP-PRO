// ─────────────────────────────────────────────────────────────────────────────
// IdeaHintsPanel.tsx — Collapsible idea hints accordion for writing tasks
// ─────────────────────────────────────────────────────────────────────────────

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Lightbulb } from "lucide-react";

// ── Props ─────────────────────────────────────────────────────────────────────

interface IdeaHintsPanelProps {
  hints: string[];
}

/**
 * Writing task idea hints — shown in the right sidebar on the instruction page.
 * Uses the same shadcn/ui Accordion pattern as VocabularyPanel / ConnectorList.
 */
export function IdeaHintsPanel({ hints }: IdeaHintsPanelProps) {
  if (!hints.length) return null;

  return (
    <Accordion>
      <AccordionItem
        value="idea-hints"
        className="border border-border rounded-xl overflow-hidden"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline bg-surface">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="w-4 h-4 text-warning" />
            Idea Hints
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 bg-surface">
          <ul className="mt-2 space-y-2">
            {hints.map((hint, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground leading-snug"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning text-[10px] font-bold">
                  {i + 1}
                </span>
                {hint}
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
