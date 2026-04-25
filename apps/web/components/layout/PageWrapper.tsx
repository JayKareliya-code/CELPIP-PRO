import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  /** Remove max-width constraint for full-bleed sections */
  fullWidth?: boolean;
  /** Extra classes on the outer container */
  className?: string;
}

/**
 * Standard page content wrapper.
 * Provides consistent max-width, horizontal padding, and vertical spacing.
 * Use this inside every authenticated page (not inside practice sessions).
 */
export function PageWrapper({ children, fullWidth = false, className }: PageWrapperProps) {
  return (
    <main className="flex-1 py-6">
      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6 lg:px-8",
          !fullWidth && "max-w-7xl",
          className
        )}
      >
        {children}
      </div>
    </main>
  );
}
