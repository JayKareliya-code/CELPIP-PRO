"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingMockExamExitGuard — Exit button + confirm modal for the mock exam.
//
// WHY THIS EXISTS:
//   The exit button is rendered OUTSIDE the fixed-canvas div (z-[55]) so it
//   stays above the canvas. But that means it can't share state with
//   WritingMockExamShell (which lives inside the canvas).
//
//   The original approach used a CustomEvent bridge, but it caused two bugs:
//     1. Radix's Dialog applies aria-hidden to the page and hides the focused
//        exit button, producing a browser accessibility warning.
//     2. The ConfirmModal was inside the z-[55] stacking context, so Radix's
//        portal backdrop could render behind the canvas.
//
//   The fix: co-locate the exit button AND the ConfirmModal in this single
//   client component, which is rendered outside the canvas in page.tsx.
//   Both the button and the modal are in the root stacking context — no
//   z-index conflict, no aria-hidden conflict.
//
// HOW IT WORKS:
//   Clicking "Back" opens a ConfirmModal (local state). Confirming navigates
//   to /mock-test/writing. Cancelling closes the modal and returns focus to
//   the exit button via a ref.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { useRouter }        from "next/navigation";
import { ArrowLeft }        from "lucide-react";
import { ConfirmModal }     from "@/components/common/ConfirmModal";

interface WritingMockExamExitGuardProps {
  /** Where to navigate on confirmed exit. Defaults to /mock-test/writing. */
  exitHref?: string;
}

export function WritingMockExamExitGuard({
  exitHref = "/mock-test/writing",
}: WritingMockExamExitGuardProps) {
  const router     = useRouter();
  const [open, setOpen] = useState(false);
  const btnRef     = useRef<HTMLButtonElement>(null);

  const handleOpenModal = () => setOpen(true);

  const handleCancel = () => {
    setOpen(false);
    // Return focus to the exit button so keyboard users aren't stranded
    requestAnimationFrame(() => btnRef.current?.focus());
  };

  const handleConfirm = () => {
    setOpen(false);
    router.push(exitHref);
  };

  return (
    <>
      {/* Exit button — z-[60] places it above the z-[55] canvas */}
      <button
        ref={btnRef}
        onClick={handleOpenModal}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 px-3 py-2
                   rounded-lg bg-white/[0.08] hover:bg-white/[0.15]
                   border border-white/[0.15] hover:border-white/30
                   text-white/70 hover:text-white text-sm font-medium
                   backdrop-blur-sm transition-all duration-150"
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Confirm modal — rendered in the root stacking context, outside the canvas.
          This avoids the aria-hidden/focus conflict that occurs when the modal
          is inside the z-[55] canvas and Radix hides the focused exit button. */}
      <ConfirmModal
        open={open}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        title="Leave this exam?"
        description="Your progress on the current task will be lost. The exam cannot be resumed."
        confirmLabel="Leave exam"
        isDestructive
      />
    </>
  );
}
