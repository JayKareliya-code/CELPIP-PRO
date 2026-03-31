import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskPromptBoxProps {
  promptText: string;
  /** Optional context image URL (Tasks 3, 4, 8) */
  imageUrl?: string;
  className?: string;
}

/**
 * Renders the task prompt text in a styled box.
 * Optionally shows a context image placeholder below the text for image-based tasks.
 */
export function TaskPromptBox({ promptText, imageUrl, className }: TaskPromptBoxProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-xl border border-border p-6",
        className
      )}
    >
      <p className="text-base leading-relaxed text-foreground whitespace-pre-line">
        {promptText}
      </p>

      {/* Image placeholder or actual image */}
      {imageUrl && (
        <div className="mt-4 rounded-lg overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Task context image" className="w-full object-cover max-h-64" />
        </div>
      )}

      {/* Placeholder shown when task has an image but src not yet provided */}
      {!imageUrl && promptText.toLowerCase().includes("[image prompt]") && (
        <div className="mt-4 flex items-center justify-center h-40 rounded-lg bg-muted border border-dashed border-border text-subtle">
          <div className="flex flex-col items-center gap-2 text-sm">
            <ImageIcon className="w-8 h-8 opacity-40" />
            <span>Context image shown during exam</span>
          </div>
        </div>
      )}
    </div>
  );
}
