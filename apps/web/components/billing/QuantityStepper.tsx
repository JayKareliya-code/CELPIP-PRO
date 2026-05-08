"use client";

// ─────────────────────────────────────────────────────────────────────────────
// QuantityStepper.tsx — Reusable −/qty/+ stepper control
//
// Used by BillingCartItem for per-item quantity adjustment.
// Calls onDecrease when quantity is 1 to signal removal from cart.
// ─────────────────────────────────────────────────────────────────────────────

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  id: string;
  value: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityStepper({
  id,
  value,
  onIncrease,
  onDecrease,
  min = 1,
  max,
  className,
}: QuantityStepperProps) {
  const canDecrease = value > min;
  const canIncrease = max === undefined || value < max;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        id={`${id}-decrease`}
        onClick={onDecrease}
        disabled={!canDecrease}
        aria-label="Decrease quantity"
        className={cn(
          "w-6 h-6 rounded-md border border-border flex items-center justify-center",
          "text-subtle hover:text-foreground hover:bg-muted transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "disabled:opacity-30 disabled:cursor-not-allowed",
        )}
      >
        <Minus className="w-3 h-3" />
      </button>

      <span className="w-5 text-center text-sm font-medium text-foreground tabular-nums select-none">
        {value}
      </span>

      <button
        id={`${id}-increase`}
        onClick={onIncrease}
        disabled={!canIncrease}
        aria-label="Increase quantity"
        className={cn(
          "w-6 h-6 rounded-md border border-border flex items-center justify-center",
          "text-subtle hover:text-foreground hover:bg-muted transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "disabled:opacity-30 disabled:cursor-not-allowed",
        )}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
