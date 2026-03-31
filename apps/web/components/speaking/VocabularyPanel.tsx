import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen } from "lucide-react";

interface VocabularyPanelProps {
  tips: string[];
}

/**
 * Collapsible vocabulary tips panel using shadcn/ui Accordion.
 * Each tip is rendered as a styled chip badge.
 */
export function VocabularyPanel({ tips }: VocabularyPanelProps) {
  return (
    <Accordion>
      <AccordionItem value="vocabulary" className="border border-border rounded-xl overflow-hidden">
        <AccordionTrigger className="px-4 py-3 hover:no-underline bg-surface">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="w-4 h-4 text-primary" />
            Key Vocabulary
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 bg-surface">
          <div className="flex flex-wrap gap-2 pt-2">
            {tips.map((tip) => (
              <span
                key={tip}
                className="inline-block px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-medium border border-primary/20"
              >
                {tip}
              </span>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
