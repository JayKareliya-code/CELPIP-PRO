import Link from "next/link";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  /** Phase when this will be available, e.g. "Phase 2" */
  availableIn?: string;
  /** Optional CTA to redirect the user somewhere useful */
  cta?: { label: string; href: string };
}

/**
 * Generic "coming soon" placeholder for Phase 2/3/4 pages.
 * Keeps all routes navigable and browsable from day one.
 */
export function PlaceholderPage({
  title,
  description,
  availableIn = "a future phase",
  cta,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-6">
        <Construction className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-subtle max-w-md">
        {description ?? `This section is coming in ${availableIn}. We're building it with care so the experience is right.`}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-6 inline-flex items-center px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
