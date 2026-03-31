"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ErrorAlertProps {
  /** Primary error message shown to the user */
  message: string;
  /** Optional detail / secondary line */
  detail?: string;
  /** If provided, shows a "Try again" button */
  onRetry?: () => void;
  className?: string;
}

/**
 * Standardised error state block.
 * Wraps shadcn/ui Alert (destructive variant) with an optional retry action.
 */
export function ErrorAlert({ message, detail, onRetry, className }: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className={cn("flex gap-3", className)}>
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <AlertTitle>{message}</AlertTitle>
        {detail && <AlertDescription className="mt-1">{detail}</AlertDescription>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        )}
      </div>
    </Alert>
  );
}
