import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LayoutTemplate, ArrowRight } from "lucide-react";

interface TemplateCardProps {
  hint: string;
}

/**
 * Collapsible structural template accordion panel.
 * Splits the hint on " → " to render each step as a numbered flow item.
 */
export function TemplateCard({ hint }: TemplateCardProps) {
  const steps = hint.split(/\s*[→—]\s*/);

  return (
    <Accordion>
      <AccordionItem value="template" className="border border-border rounded-xl overflow-hidden">
        <AccordionTrigger className="px-4 py-3 hover:no-underline bg-surface">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <LayoutTemplate className="w-4 h-4 text-warning" />
            Response Template
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 bg-surface">
          <div className="pt-2 space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                {index > 0 && (
                  <ArrowRight className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                )}
                {index === 0 && (
                  <span className="text-xs font-bold text-warning mt-0.5 w-3.5 shrink-0">1.</span>
                )}
                <span className="text-sm text-foreground">{step.trim()}</span>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
