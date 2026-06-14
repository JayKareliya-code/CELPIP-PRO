"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  key:   string;
  label: string;
}

interface BillingSelectProps {
  value:      string;
  onChange:   (key: string) => void;
  options:    SelectOption[];
  disabled?:  boolean;
  /** Extra classes on the trigger button */
  className?: string;
  /** Placeholder shown when no value matches */
  placeholder?: string;
}

export function BillingSelect({
  value,
  onChange,
  options,
  disabled = false,
  className,
  placeholder = "Select…",
}: BillingSelectProps) {
  const id               = useId();
  const [open, setOpen]  = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [openUp, setOpenUp]     = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef    = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o) => o.key === value);

  // ── Open / close helpers ──────────────────────────────────────────────────

  const close = useCallback(() => {
    setOpen(false);
    setFocusIdx(-1);
  }, []);

  const openDropdown = useCallback(() => {
    if (disabled) return;

    // Decide direction based on available viewport space
    if (wrapperRef.current) {
      const rect       = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 220); // 220px ≈ max-h-[200px]
    }

    setOpen(true);
    // Pre-select focused index to the currently selected item
    const idx = options.findIndex((o) => o.key === value);
    setFocusIdx(idx >= 0 ? idx : 0);
  }, [disabled, options, value]);

  const toggleDropdown = useCallback(() => {
    if (open) close();
    else      openDropdown();
  }, [open, close, openDropdown]);

  // ── Outside-click ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, close]);

  // ── Keyboard navigation ───────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (!open) {
            openDropdown();
          } else if (focusIdx >= 0 && focusIdx < options.length) {
            onChange(options[focusIdx].key);
            close();
          }
          break;

        case "Escape":
          e.preventDefault();
          close();
          triggerRef.current?.focus();
          break;

        case "ArrowDown":
          e.preventDefault();
          if (!open) {
            openDropdown();
          } else {
            setFocusIdx((i) => Math.min(i + 1, options.length - 1));
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (open) {
            setFocusIdx((i) => Math.max(i - 1, 0));
          }
          break;

        case "Tab":
          if (open) close();
          break;
      }
    },
    [disabled, open, focusIdx, options, onChange, close, openDropdown],
  );

  // ── Scroll focused option into view ──────────────────────────────────────

  useEffect(() => {
    if (!open || focusIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[focusIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [open, focusIdx]);

  // ── Select an option ─────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (key: string) => {
      onChange(key);
      close();
      triggerRef.current?.focus();
    },
    [onChange, close],
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>

      {/* ── Trigger button ─────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        id={`billing-select-trigger-${id}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`billing-select-list-${id}`}
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm text-left",
          "bg-transparent text-white/70",
          "transition-colors duration-150 outline-none",
          open
            ? "border-primary/40 ring-1 ring-primary/15"
            : "border-white/[0.12] hover:border-white/[0.22]",
          "focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/15",
          disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-white/30")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-white/30 shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {/* ── Dropdown panel ─────────────────────────────────────────────────── */}
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          id={`billing-select-list-${id}`}
          aria-labelledby={`billing-select-trigger-${id}`}
          onKeyDown={handleKeyDown}
          className={cn(
            "absolute left-0 right-0 z-[60]",
            openUp ? "bottom-full mb-1" : "top-full mt-1",
            "bg-[#111318] border border-white/[0.14] rounded-lg",
            "shadow-[0_12px_40px_rgba(0,0,0,0.7)]",
            "max-h-[200px] overflow-y-auto",
            "py-1",
            // Custom scrollbar
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-white/10",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
          )}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.key === value;
            const isFocused  = idx === focusIdx;
            return (
              <li
                key={opt.key}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.key)}
                onMouseEnter={() => setFocusIdx(idx)}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer select-none",
                  "transition-colors duration-100",
                  isSelected
                    ? "text-primary"
                    : isFocused
                      ? "text-white/90 bg-white/[0.05]"
                      : "text-white/55 hover:text-white/90 hover:bg-white/[0.04]",
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
