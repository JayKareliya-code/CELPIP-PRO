// ─────────────────────────────────────────────────────────────────────────────
// lib/nav-links.ts — Single source of truth for authenticated navigation
//
// Imported by both Navbar (desktop links) and Sidebar (mobile drawer).
// Any route addition here automatically propagates to both surfaces.
// ─────────────────────────────────────────────────────────────────────────────

import {
  LayoutDashboard, Mic, PenLine, PlayCircle,
  History, TrendingUp, CreditCard, Settings,
} from "lucide-react";

export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/speaking",  label: "Speaking",  icon: Mic             },
  { href: "/writing",   label: "Writing",   icon: PenLine         },
  { href: "/mock-test", label: "Mock Test", icon: PlayCircle      },
  { href: "/history",   label: "History",   icon: History         },
  { href: "/progress",  label: "Progress",  icon: TrendingUp      },
  { href: "/billing",   label: "Billing",   icon: CreditCard      },
] as const;

export const BOTTOM_NAV_LINKS = [
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
