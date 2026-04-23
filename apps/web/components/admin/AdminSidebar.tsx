"use client";

import Link            from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookCopy, Sliders, Image, BookOpen,
  Tag, ClipboardList, ChevronRight, DollarSign,
} from "lucide-react";
import { cn }     from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

interface NavItem { href: string; label: string; icon: React.ElementType }

const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.admin,            label: "Overview",    icon: LayoutDashboard },
  { href: ROUTES.adminPrompts,     label: "Prompts",     icon: BookCopy        },
  { href: ROUTES.adminMaterials,   label: "Materials",   icon: BookOpen        },
  { href: ROUTES.adminAssets,      label: "Assets",      icon: Image           },
  { href: ROUTES.adminTags,        label: "Tags",        icon: Tag             },
  { href: ROUTES.adminCalibration, label: "Calibration", icon: Sliders         },
  { href: ROUTES.adminAudit,       label: "Audit Log",   icon: ClipboardList   },
  { href: ROUTES.adminCostReport,  label: "Cost Report", icon: DollarSign      },
];

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
        "flex-col py-6 gap-1 px-3",
        "hidden lg:flex",
      )}
      aria-label="Admin navigation"
    >
      <p className="text-[10px] uppercase tracking-widest text-subtle font-semibold px-3 mb-2">
        Admin
      </p>

      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === ROUTES.admin ? pathname === ROUTES.admin : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex items-center justify-between gap-3 rounded-lg px-3 py-2",
              "text-sm font-medium transition-colors duration-150",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-subtle hover:bg-muted hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="flex items-center gap-2.5">
              <Icon
                className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-subtle/70")}
              />
              {label}
            </span>
            {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary/60" />}
          </Link>
        );
      })}
    </aside>
  );
}
