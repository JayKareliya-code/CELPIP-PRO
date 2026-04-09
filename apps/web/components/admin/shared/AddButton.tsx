// ─────────────────────────────────────────────────────────────────────────────
// shared/AddButton.tsx — Reusable "Add …" action button for admin tables.
//
// Previously duplicated verbatim in SpeakingPromptTable, WritingPromptTable,
// and CalibrationSampleTable. Each copy had a different `id` and label but
// identical structure. Now centralised here; callers pass `id` and `label`.
// ─────────────────────────────────────────────────────────────────────────────

import { Plus } from "lucide-react";

interface AddButtonProps {
  /** Unique id for browser/testing hooks. Required — every table has its own. */
  id: string;
  /** Button label text, e.g. "Add Prompt" or "Add Sample". */
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Primary action button used above every admin data table.
 * Renders a green "Add …" button with a Plus icon.
 */
export function AddButton({ id, label, onClick, disabled = false }: AddButtonProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover
                 text-white text-sm font-semibold transition-colors shadow-sm
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Plus className="w-4 h-4" aria-hidden="true" />
      {label}
    </button>
  );
}
