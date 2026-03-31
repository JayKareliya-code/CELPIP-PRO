"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ConclusionTemplateCard.tsx — Collapsible conclusion paragraph template
//
// Mirrors IntroTemplateCard exactly — only the icon and label differ.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckSquare, Copy, CheckCheck } from "lucide-react";
import { useState }                      from "react";
import { cn }                            from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface ConclusionTemplateCardProps {
  /** Conclusion paragraph template text from the writing task. */
  template: string;
}

/**
 * Collapsible conclusion template with a one-click copy button.
 * Extracted into its own file to satisfy the one-component-one-file rule,
 * even though the implementation mirrors IntroTemplateCard structurally.
 */
export function ConclusionTemplateCard({ template }: ConclusionTemplateCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Clipboard API not available — silently ignore
    }
  };

  return (
    <Accordion>
      <AccordionItem
        value="conclusion-template"
        className="border border-border rounded-xl overflow-hidden"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline bg-surface">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckSquare className="w-4 h-4 text-success" />
            Conclusion Template
          </div>
        </AccordionTrigger>
        <AccordionContent className="bg-surface">
          <div className="px-4 pb-4 space-y-3">
            {/* Template text */}
            <p className="text-sm text-foreground leading-relaxed pt-2 italic border-l-2 border-success/40 pl-3">
              &ldquo;{template}&rdquo;
            </p>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150",
                copied
                  ? "bg-success/10 text-success border border-success/30"
                  : "bg-success/10 text-success hover:bg-success/20 border border-success/20"
              )}
            >
              {copied ? (
                <><CheckCheck className="w-3.5 h-3.5" /> Copied!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copy to clipboard</>
              )}
            </button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
