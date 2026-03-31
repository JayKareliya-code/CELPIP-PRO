import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /** Visual size of the spinner */
  size?: "sm" | "md" | "lg";
  /** Accessible label for screen readers */
  label?: string;
  /** Extra classes on the wrapper */
  className?: string;
}

const sizeMap = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-[3px]",
} as const;

/**
 * Centered Tailwind CSS spinner.
 * Drop this anywhere a loading state is needed — it sizes itself via the `size` prop.
 */
export function LoadingSpinner({
  size = "md",
  label = "Loading…",
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex items-center justify-center", className)}
    >
      <div
        className={cn(
          "rounded-full border-primary/30 border-t-primary animate-spin",
          sizeMap[size]
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
