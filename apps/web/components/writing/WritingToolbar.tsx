// ─────────────────────────────────────────────────────────────────────────────
// WritingToolbar.tsx — Bold / Italic / Underline formatting toolbar
//
// Works with the native contenteditable WritingEditor (not Tiptap).
//
// KNOWN DEPRECATION — document.execCommand:
//   `execCommand('bold' | 'italic' | 'underline')` is deprecated (MDN) but
//   not yet removed from any shipping browser. Replacing it for formatting
//   (not paste — paste is fixed in WritingEditor.tsx) requires fully manual
//   Range-wrapping logic or adopting a rich-text library.
//   TODO (Phase 2): evaluate Tiptap (headless) as a drop-in replacement
//   once paste-lane and toolbar share the same command surface.
//
// The editor ref is passed in so the toolbar can refocus after each action.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback }  from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { cn }                      from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingToolbarProps {
  /** Ref to the contenteditable div — used to refocus after execCommand. */
  editorRef: React.RefObject<HTMLDivElement>;
  /** Whether the editor is in editable mode (disabled during SUBMITTING). */
  editable?: boolean;
  className?: string;
}

// ── Active-command detection helper ───────────────────────────────────────────

/**
 * Queries the browser's selection state to determine if a format command
 * is currently active (e.g. selection is inside bold text).
 * Returns false on SSR.
 */
function isCommandActive(command: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

// ── Toolbar button ─────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  label:    string;
  command:  string;
  icon:     React.ElementType;
  disabled: boolean;
  onFormat: (command: string) => void;
}

function ToolbarButton({
  label,
  command,
  icon: Icon,
  disabled,
  onFormat,
}: ToolbarButtonProps) {
  const [active, setActive] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      // Prevent the editor from losing focus on click
      e.preventDefault();
      setActive(isCommandActive(command));
      onFormat(command);
      // Re-query after a tick so state reflects the new selection
      requestAnimationFrame(() => setActive(isCommandActive(command)));
    },
    [command, onFormat]
  );

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded",
        "text-sm font-medium transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-primary/10 text-primary"
          : "text-subtle hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Formatting toolbar for the native contenteditable WritingEditor.
 * Executes formatting via `document.execCommand` — the correct mechanism
 * for manipulating contenteditable content without a rich-text library.
 *
 * Uses `onPointerDown` (not `onClick`) to apply formatting before the editor
 * loses its selection focus.
 */
export function WritingToolbar({
  editorRef,
  editable = true,
  className,
}: WritingToolbarProps) {
  const handleFormat = useCallback(
    (command: string) => {
      if (!editable) return;
      // execCommand operates on the current selection in the active contenteditable
      document.execCommand(command, false);
      // Refocus the editor so the user can keep typing
      editorRef.current?.focus();
    },
    [editable, editorRef]
  );

  const BUTTONS = [
    { label: "Bold",      command: "bold",      icon: Bold      },
    { label: "Italic",    command: "italic",    icon: Italic    },
    { label: "Underline", command: "underline", icon: Underline },
  ] as const;

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className={cn(
        "flex items-center gap-1 px-3 py-2 border-b border-border bg-surface",
        className
      )}
    >
      {BUTTONS.map(({ label, command, icon }) => (
        <ToolbarButton
          key={command}
          label={label}
          command={command}
          icon={icon}
          disabled={!editable}
          onFormat={handleFormat}
        />
      ))}
    </div>
  );
}
