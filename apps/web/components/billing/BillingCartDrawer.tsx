"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BillingCartPanel } from "./BillingCartPanel";

interface DrawerContextValue {
  isOpen: boolean;
  open:   () => void;
  close:  () => void;
  toggle: () => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useBillingCartDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useBillingCartDrawer must be used inside BillingCartDrawerProvider");
  return ctx;
}

export function BillingCartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open   = useCallback(() => setIsOpen(true),  []);
  const close  = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((s) => !s), []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <DrawerContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function BillingCartDrawer() {
  const { isOpen, close } = useBillingCartDrawer();

  return (
    <>
      <div
        role="presentation"
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      <aside
        aria-label="Shopping cart"
        aria-modal="true"
        role="dialog"
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] flex flex-col",
          "bg-[#0D0F17] border-l border-white/[0.06] shadow-[0_0_60px_rgba(0,0,0,0.8)]",
          "font-light tracking-wide transition-transform duration-300 ease-out will-change-transform",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-sm font-semibold tracking-widest uppercase text-white/50">Your Cart</h2>
          <button
            onClick={close}
            aria-label="Close cart"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <BillingCartPanel embedded />
        </div>
      </aside>
    </>
  );
}
