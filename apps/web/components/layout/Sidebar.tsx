"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar.tsx — Mobile slide-in navigation drawer
//
// DESKTOP: hidden (lg:hidden) — the Navbar handles desktop navigation.
// MOBILE:  full-height panel sliding in from the left, triggered by the
//          hamburger button in the Navbar.
//
// Props:
//   open    — controlled open state (owned by Navbar)
//   onClose — callback to close the drawer
// ─────────────────────────────────────────────────────────────────────────────

import Link              from "next/link";
import { usePathname }   from "next/navigation";
import { useEffect }     from "react";
import { X }             from "lucide-react";
import { cn }            from "@/lib/utils";
import { NAV_LINKS, BOTTOM_NAV_LINKS } from "@/lib/nav-links";


// ── Component ─────────────────────────────────────────────────────────────────

interface MobileSidebarProps {
  open:    boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  // Auto-close on route change.
  // onClose is a stable useCallback from Navbar — safe in dep array.
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock body scroll via CSS class — safer than inline style
  // (avoids conflict if other modals also need this)
  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", open);
    return () => { document.body.classList.remove("overflow-hidden"); };
  }, [open]);

  return (
    // Only renders on mobile — desktop uses the Navbar
    <div className="lg:hidden">

      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        aria-hidden="true"
      />

      {/* ── Drawer panel ─────────────────────────────────────────────────── */}
      <aside
        id="mobile-sidebar"
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 flex flex-col",
          "bg-[#000000] border-r border-white/[0.07]",
          "shadow-[4px_0_32px_rgba(0,0,0,0.6)]",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Navigation menu"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06] shrink-0">
          <Link
            href="/"
            className="flex items-center select-none"
            onClick={onClose}
          >
            <span className="text-xl font-black tracking-tight text-white">CELPIP</span>
            <span className="text-xl font-black tracking-tight text-primary">BRO</span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-white/55 hover:text-white/90 hover:bg-white/[0.04]",
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 border-t border-white/[0.06] pt-3 space-y-0.5 shrink-0">
          {BOTTOM_NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-white/55 hover:text-white/90 hover:bg-white/[0.04]",
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            );
          })}

          <p className="text-[10px] text-white/20 text-center pt-3">
            CELPIPBRO · AI-Powered CELPIP Practice
          </p>
        </div>

      </aside>
    </div>
  );
}
