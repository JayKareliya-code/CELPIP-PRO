// ─────────────────────────────────────────────────────────────────────────────
// ImagePlaceholder.tsx — Placeholder shown when an image-based task has no
// context_image_url yet (e.g. a coming-soon prompt slot in the admin UI).
// ─────────────────────────────────────────────────────────────────────────────

import { ImageIcon } from "lucide-react";
import { cn }        from "@/lib/utils";

interface ImagePlaceholderProps {
  className?: string;
}

export function ImagePlaceholder({ className }: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-t-xl bg-white/[0.03] border-b border-dashed border-border",
        "h-32",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1.5 text-subtle/40">
        <ImageIcon className="w-6 h-6" />
        <span className="text-xs">Scene image</span>
      </div>
    </div>
  );
}
