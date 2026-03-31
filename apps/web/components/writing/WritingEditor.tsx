// ─────────────────────────────────────────────────────────────────────────────
// WritingEditor.tsx — Contenteditable writing area
//
// Features:
//   • Native browser spell check (red underlines + right-click suggestions)
//   • Draft persistence: content saved to sessionStorage on every keystroke,
//     restored on mount — page refresh doesn't lose work.
//   • Plain-text paste only — strips rich formatting via Selection/Range API
//     (BUG-01: replaced deprecated document.execCommand("insertText"))
//   • CSS placeholder when empty (via globals.css #writing-editor::before rule)
//   • Spell-check reminder banner shown once per session (BUG-06 fix:
//     el.spellcheck is always true after setAttribute, so we now use
//     sessionStorage to show the banner proactively and let users dismiss it)
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WritingToolbar } from "@/components/writing/WritingToolbar";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingEditorProps {
  /**
   * Fired on every keystroke.
   * `html`      — innerHTML (for API submission).
   * `plainText` — innerText (for word count).
   */
  onUpdate: (html: string, plainText: string) => void;
  /** Lock the editor during SUBMITTING phase. */
  editable?: boolean;
  /**
   * sessionStorage key used to persist the draft.
   * Pass the task ID so each task has its own draft slot.
   * Omit to disable draft persistence.
   */
  sessionKey?: string;
  className?: string;
}

// ── Draft persistence helpers ─────────────────────────────────────────────────

const DRAFT_PREFIX = "celpip-writing-draft-";

function saveDraft(key: string, html: string): void {
  try { sessionStorage.setItem(DRAFT_PREFIX + key, html); } catch { /* quota */ }
}

function loadDraft(key: string): string | null {
  try { return sessionStorage.getItem(DRAFT_PREFIX + key); } catch { return null; }
}

/** Call on submit or explicit exit to wipe the draft. */
export function clearDraft(key: string): void {
  try { sessionStorage.removeItem(DRAFT_PREFIX + key); } catch { /* noop */ }
}

// ── Spell-check banner helpers ────────────────────────────────────────────────

// Why we can't detect browser spell-check programmatically:
//   Checking `el.spellcheck` after `setAttribute("spellcheck","true")` always
//   returns true — we just set it. The browser's OS-level spell-check on/off
//   state is not exposed via any JS API. We show the reminder banner
//   proactively once per browser session and persist the dismissal.
const SPELLCHECK_DISMISSED_KEY = "celpip-sc-dismissed";

function isBannerDismissed(): boolean {
  try { return sessionStorage.getItem(SPELLCHECK_DISMISSED_KEY) === "1"; } catch { return false; }
}

function persistDismissal(): void {
  try { sessionStorage.setItem(SPELLCHECK_DISMISSED_KEY, "1"); } catch { /* noop */ }
}

function getSpellCheckHelpUrl(): string {
  if (typeof navigator === "undefined") return "https://support.google.com/chrome/answer/95604";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("firefox"))
    return "https://support.mozilla.org/en-US/kb/how-do-i-use-firefox-spell-checker";
  if (ua.includes("edg"))
    return "https://support.microsoft.com/en-us/microsoft-edge/use-spell-checker-in-microsoft-edge";
  return "https://support.google.com/chrome/answer/95604";
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Plain contenteditable writing editor.
 *
 * Architecture decisions:
 *   - contenteditable (not Tiptap/ProseMirror): ProseMirror hard-codes
 *     spellcheck=false; textarea can't overlay HTML decorations.
 *   - Paste uses Selection/Range API (not execCommand): execCommand is
 *     deprecated (MDN) and will be removed. Range.insertNode() is the
 *     W3C-specified replacement and works in all current browsers.
 *   - Spell-check banner is shown once per session, not conditionally on
 *     el.spellcheck (which is always true after setAttribute).
 */
export function WritingEditor({
  onUpdate,
  editable = true,
  sessionKey,
  className,
}: WritingEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Default true (hidden) on SSR — checked on client after mount
  const [bannerDismissed, setBannerDismissed] = useState(true);

  // ── Mount: restore draft, enforce spellcheck, evaluate banner ────────────

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    // Force spellcheck — nothing overrides us (no ProseMirror shadow DOM)
    el.setAttribute("spellcheck", "true");
    el.setAttribute("lang", "en");

    // Restore persisted draft
    if (sessionKey) {
      const saved = loadDraft(sessionKey);
      if (saved) {
        el.innerHTML = saved;
        onUpdate(el.innerHTML, el.innerText);
      }
    }

    // Show banner unless already dismissed this browser session
    if (!isBannerDismissed()) {
      setBannerDismissed(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync editable prop ────────────────────────────────────────────────────

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.contentEditable = editable ? "true" : "false";
  }, [editable]);

  // ── Input handler ─────────────────────────────────────────────────────────

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onUpdate(el.innerHTML, el.innerText);
    if (sessionKey) saveDraft(sessionKey, el.innerHTML);
  }, [onUpdate, sessionKey]);

  // ── Paste: plain-text via Selection/Range API (BUG-01 fix) ───────────────
  //
  // Old code: document.execCommand("insertText", false, text)  ← deprecated
  // New code: Selection/Range API                              ← W3C standard
  //
  // Steps:
  //   1. Prevent default rich-text paste
  //   2. Extract plain text from clipboard
  //   3. Delete any currently selected text
  //   4. Insert a text node at the cursor
  //   5. Collapse cursor to end of inserted node
  //   6. Sync word count + draft

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;

      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      range.deleteContents();

      const node = document.createTextNode(text);
      range.insertNode(node);

      // Collapse cursor to just after the inserted text
      range.setStartAfter(node);
      range.setEndAfter(node);
      selection.removeAllRanges();
      selection.addRange(range);

      // Sync word count + draft
      const el = editorRef.current;
      if (el) {
        onUpdate(el.innerHTML, el.innerText);
        if (sessionKey) saveDraft(sessionKey, el.innerHTML);
      }
    },
    [onUpdate, sessionKey]
  );

  // ── Dismiss banner ────────────────────────────────────────────────────────

  const handleDismiss = useCallback(() => {
    persistDismissal();
    setBannerDismissed(true);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-surface shadow-card overflow-hidden",
        className
      )}
    >
      {/* Formatting toolbar */}
      <WritingToolbar editorRef={editorRef} editable={editable} />

      {/* Spell-check reminder — shown once per browser session */}
      {!bannerDismissed && (
        <div
          role="alert"
          className="flex items-start gap-3 px-4 py-3 bg-warning/10 border-b border-warning/30"
        >
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning flex-1 leading-relaxed">
            <strong>Enable browser spell check for the best experience.</strong>{" "}
            <a
              href={getSpellCheckHelpUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:opacity-80"
            >
              Learn how to enable it
            </a>{" "}
            — then refresh this page.
          </p>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss spell-check reminder"
            className="text-warning hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Writing area */}
      <div
        ref={editorRef}
        id="writing-editor"
        spellCheck
        lang="en"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        contentEditable={editable ? "true" : "false"}
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        role="textbox"
        aria-multiline="true"
        aria-label="Writing response area"
        data-placeholder="Begin writing your response here…"
        className={cn(
          "min-h-[400px] p-5 outline-none font-serif text-base leading-relaxed",
          "text-foreground caret-primary",
          !editable && "cursor-not-allowed opacity-50 select-none"
        )}
      />
    </div>
  );
}
