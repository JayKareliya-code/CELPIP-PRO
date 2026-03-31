import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link2 } from "lucide-react";

interface ConnectorListProps {
  phrases: string[];
}

/**
 * Collapsible discourse connectors panel using shadcn/ui Accordion.
 * Connectors are listed as numbered items to aid memorization.
 */
export function ConnectorList({ phrases }: ConnectorListProps) {
  return (
    <Accordion>
      <AccordionItem value="connectors" className="border border-border rounded-xl overflow-hidden">
        <AccordionTrigger className="px-4 py-3 hover:no-underline bg-surface">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Link2 className="w-4 h-4 text-success" />
            Connectors &amp; Transitions
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 bg-surface">
          <ol className="space-y-2 pt-2">
            {phrases.map((phrase, index) => (
              <li key={phrase} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-xs font-bold text-success mt-0.5 w-4 shrink-0">
                  {index + 1}.
                </span>
                <span className="font-medium">&quot;{phrase}&quot;</span>
              </li>
            ))}
          </ol>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
