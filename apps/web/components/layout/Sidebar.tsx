"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  PenLine,
  History,
  TrendingUp,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const SIDEBAR_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/speaking",  label: "Speaking",  icon: Mic            },
  { href: "/writing",   label: "Writing",   icon: PenLine        },
  { href: "/practice",  label: "Practice",  icon: PlayCircle     },
  { href: "/history",   label: "History",   icon: History        },
  { href: "/progress",  label: "Progress",  icon: TrendingUp     },
  { href: "/billing",   label: "Billing",   icon: CreditCard     },
];

const BOTTOM_LINKS = [
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
}

/**
 * Collapsible sidebar for dashboard and inner pages.
 * - On desktop: expands/collapses with a toggle button.
 * - On mobile: hidden (Navbar handles mobile navigation).
 */
export function Sidebar({ className }: SidebarProps) {
  const pathname    = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-surface border-r border-border transition-all duration-200",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Main nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
              isActive(href)
                ? "bg-primary-light text-primary"
                : "text-subtle hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 border-t border-border pt-3">
        {BOTTOM_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-primary-light text-primary"
                : "text-subtle hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-subtle hover:text-foreground hover:bg-muted transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
            : (
              <>
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                <span>Collapse</span>
              </>
            )
          }
        </button>
      </div>
    </aside>
  );
}
