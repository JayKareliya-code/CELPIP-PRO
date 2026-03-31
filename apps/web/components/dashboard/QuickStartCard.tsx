import Link from "next/link";
import { Mic, PenLine, ArrowRight } from "lucide-react";

interface QuickStartAction {
  label: string;
  sublabel: string;
  href: string;
  icon: React.ElementType;
  colorClasses: string;
}

const actions: QuickStartAction[] = [
  {
    label: "Speaking Practice",
    sublabel: "Tasks 1–8 · up to 90 sec",
    href: "/speaking",
    icon: Mic,
    colorClasses:
      "bg-primary-light hover:bg-primary/10 border-primary/20 text-primary",
  },
  {
    label: "Writing Practice",
    sublabel: "Tasks 1–2 · up to 27 min",
    href: "/writing",
    icon: PenLine,
    colorClasses:
      "bg-success-light hover:bg-success/10 border-success/30 text-success",
  },
];

/**
 * Two large CTA cards on the dashboard — one for speaking, one for writing.
 * Pure server component (no interactivity needed).
 */
export function QuickStartCard() {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-card p-5">
      <h2 className="text-base font-semibold text-foreground mb-4">
        Quick Start
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map(({ label, sublabel, href, icon: Icon, colorClasses }) => (
          <Link
            key={href}
            href={href}
            className={`group flex items-center justify-between rounded-lg border p-4 transition-all duration-150 hover:shadow-card ${colorClasses}`}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs opacity-70 mt-0.5">{sublabel}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150" />
          </Link>
        ))}
      </div>
    </div>
  );
}
