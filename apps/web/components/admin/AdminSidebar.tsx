// ─────────────────────────────────────────────────────────────────────────────
// AdminSidebar.tsx — Admin-specific left navigation
//
// Rendered inside every /admin/* page layout.
// Links: Admin Home, Prompt Management, Calibration Samples.
// Active link is highlighted via pathname matching.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import Link           from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookCopy, Sliders, ChevronRight } from "lucide-react";
import { cn }          from "@/lib/utils";
import { ROUTES }      from "@/lib/constants";

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.admin,             label: "Overview",     icon: LayoutDashboard },
  { href: ROUTES.adminPrompts,      label: "Prompts",      icon: BookCopy        },
  { href: ROUTES.adminCalibration,  label: "Calibration",  icon: Sliders         },
];

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Vertical navigation sidebar for all admin pages.
 * Highlights the active route segment using `usePathname`.
 */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "w-56 shrink-0 border-r border-border bg-surface",
        "flex flex-col py-6 gap-1 px-3",
        // Hidden on mobile — admin is desktop-only in Phase 1
        "hidden lg:flex"
      )}
      aria-label="Admin navigation"
    >
      {/* Section heading */}
      <p className="text-[10px] uppercase tracking-widest text-subtle font-semibold px-3 mb-2">
        Admin
      </p>

      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        // Exact match for overview, prefix match for sub-pages
        const isActive =
          href === ROUTES.admin
            ? pathname === ROUTES.admin
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex items-center justify-between gap-3 rounded-lg px-3 py-2",
              "text-sm font-medium transition-colors duration-150",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-subtle hover:bg-muted hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="flex items-center gap-2.5">
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-subtle/70")} />
              {label}
            </span>
            {isActive && (
              <ChevronRight className="w-3.5 h-3.5 text-primary/60" />
            )}
          </Link>
        );
      })}
    </aside>
  );
}
