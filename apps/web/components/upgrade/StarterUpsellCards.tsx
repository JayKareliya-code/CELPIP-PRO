"use client";

// ─────────────────────────────────────────────────────────────────────────────
// StarterUpsellCards — Side-by-side cards rendered in the module header.
//
//   LEFT  card : Module-specific bundle ad — always visible for all users.
//   RIGHT card :
//     • Starter users → "Upgrade to Pro" amber card
//     • Pro users     → Remaining attempts stat card
//
// Clicking "Buy now" on the bundle card adds it straight to the billing cart
// and switches the button to "View cart →" (linking to /billing).
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight, Mic, PenLine, ClipboardList, Rocket, Target, Check, ShoppingCart } from "lucide-react";
import { useTaskModuleAccess } from "@/lib/hooks/useTaskModuleAccess";
import { useQuota }            from "@/lib/hooks/useQuota";
import { useCurrentUser }      from "@/lib/hooks/useCurrentUser";
import { useBillingCartStore } from "@/store/billingCartStore";
import { toast }               from "sonner";
import type { Skill }          from "@/lib/types";

// ── Module config ─────────────────────────────────────────────────────────────

type Module = "speaking" | "writing" | "mock";

interface BundleConfig {
  id:          string;
  cartType:    "speaking_pack" | "writing_pack" | "mock_bundle";
  name:        string;
  price:       number;
  priceLabel:  string;
  description: string;
  icon:        React.ReactNode;
}

const BUNDLES: Record<Module, BundleConfig> = {
  speaking: {
    id:          "speaking-pack",
    cartType:    "speaking_pack",
    name:        "Speaking Pack",
    price:       6.99,
    priceLabel:  "$6.99",
    description: "Adds 5 questions per task",
    icon:        <Mic className="w-4 h-4 text-emerald-400" />,
  },
  writing: {
    id:          "writing-pack",
    cartType:    "writing_pack",
    name:        "Writing Pack",
    price:       2.99,
    priceLabel:  "$2.99",
    description: "Adds 5 questions per task",
    icon:        <PenLine className="w-4 h-4 text-blue-400" />,
  },
  mock: {
    id:          "mock-bundle",
    cartType:    "mock_bundle",
    name:        "Mock Bundle",
    price:       2.99,
    priceLabel:  "$2.99",
    description: "1 Speaking + 1 Writing mock test",
    icon:        <ClipboardList className="w-4 h-4 text-violet-400" />,
  },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  module: Module;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StarterUpsellCards({ module }: Props) {
  const skill: Skill = module === "mock" ? "speaking" : module;

  const taskAccess = useTaskModuleAccess(skill);
  const quota      = useQuota(skill);
  const { user, isLoading: userLoading } = useCurrentUser();

  const isLoading =
    module === "mock"
      ? userLoading || quota.isLoading
      : taskAccess.isLoading;

  const plan =
    module === "mock" ? (user?.plan ?? "starter") : taskAccess.plan;

  if (isLoading) return null;

  const isStarter = plan === "starter";
  const bundle    = BUNDLES[module];

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Left: bundle ad — shown for all users */}
      <BundleCard config={bundle} />

      {/* Right: "Upgrade to Pro" for starters, attempts stat for pro users */}
      {isStarter ? (
        <ProUpgradeCard />
      ) : (
        <TargetBandCard band={user?.target_band ?? null} />
      )}
    </div>
  );
}

// ── Shared card shell ─────────────────────────────────────────────────────────

function CardShell({
  amber = false,
  children,
  className = "",
}: {
  amber?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "group relative flex flex-col gap-3 rounded-2xl border p-4 overflow-hidden transition-all duration-200",
        amber
          ? "border-amber-500/25 bg-[#111111] hover:border-amber-500/50 hover:shadow-[0_0_24px_rgba(200,150,62,0.10)]"
          : "border-white/[0.09] bg-[#111111] hover:border-white/[0.20]",
        className,
      ].join(" ")}
    >
      {amber && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
      )}
      {amber && (
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-amber-500/[0.06] to-transparent pointer-events-none" />
      )}
      {children}
    </div>
  );
}

// ── Bundle card ───────────────────────────────────────────────────────────────
// Adds straight to cart on click; button flips to "View cart →" after.

function BundleCard({ config }: { config: BundleConfig }) {
  const addItem = useBillingCartStore((s) => s.addItem);

  const handleBuy = () => {
    addItem({
      id:        config.id,
      type:      config.cartType,
      name:      config.name,
      subtitle:  config.description,
      unitPrice: config.price,
      currency:  "CAD",
      metadata:  {},
    });
    toast.success(`${config.name} added to cart`, {
      description: config.description,
      duration: 2500,
    });
  };

  return (
    <CardShell>
      {/* Top row: icon + name (left) | price (right) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.04] flex items-center justify-center shrink-0">
            {config.icon}
          </div>
          <span className="text-base font-semibold text-white/85 leading-tight truncate">
            {config.name}
          </span>
        </div>
        <div className="flex items-baseline gap-0.5 shrink-0">
          <span className="text-lg font-bold text-white tabular-nums">{config.priceLabel}</span>
          <span className="text-[10px] text-white/35 ml-0.5">CAD</span>
        </div>
      </div>

      {/* Description */}
      <div className="flex items-center gap-2 -mt-1">
        <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
        <span className="text-xs text-white/50 leading-tight">{config.description}</span>
      </div>

      {/* CTA */}
      <button
        onClick={handleBuy}
        className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-primary py-2 text-xs font-bold text-[#0D0D0D] hover:bg-primary-hover transition-all duration-200 shadow-[0_2px_10px_rgba(200,150,62,0.25)] hover:shadow-[0_4px_16px_rgba(200,150,62,0.40)] mt-auto"
      >
        Buy now
        <ShoppingCart className="w-3.5 h-3.5" />
      </button>
    </CardShell>
  );
}

// ── Pro upgrade card (for starter users) ─────────────────────────────────────
// Amber card: links directly to /billing for plan upgrade (no cart).

function ProUpgradeCard() {
  return (
    <CardShell amber>
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg border border-amber-500/25 bg-amber-500/10 flex items-center justify-center shrink-0">
            <Rocket className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-base font-semibold text-amber-100 leading-tight truncate">
            Upgrade to Pro
          </span>
        </div>
        <div className="flex items-baseline gap-0.5 shrink-0">
          <span className="text-lg font-bold text-amber-100 tabular-nums">$9.99</span>
          <span className="text-[10px] text-amber-400/50 ml-0.5">CAD</span>
        </div>
      </div>

      {/* Description */}
      <div className="flex items-center gap-2 -mt-1">
        <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
        <span className="text-xs text-amber-400/60 leading-tight">Unlock advanced AI feedback</span>
      </div>

      {/* CTA */}
      <Link
        href="/billing"
        className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-primary py-2 text-xs font-bold text-[#0D0D0D] hover:bg-primary-hover transition-all duration-200 shadow-[0_2px_10px_rgba(200,150,62,0.25)] hover:shadow-[0_4px_16px_rgba(200,150,62,0.40)] mt-auto"
      >
        Upgrade now
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </CardShell>
  );
}

// ── Target Band card (for pro users) ───────────────────────────────────────────────
// Shows the user's target band score (1–12) with a visual scale.
// Links to /settings to update it.

function TargetBandCard({ band }: { band: number | null }) {
  const hasBand  = band != null;
  // Percent along the 1–12 scale
  const pct      = hasBand ? Math.round(((band - 1) / 11) * 100) : 0;

  // Colour shifts from amber (low) → emerald (high)
  const barColor = !hasBand
    ? "bg-white/20"
    : band >= 9
    ? "bg-emerald-400"
    : band >= 7
    ? "bg-primary"
    : "bg-amber-500";

  return (
    <CardShell>
      {/* Top row: icon + label | band value */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.04] flex items-center justify-center shrink-0">
            <Target className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-base font-semibold text-white/85 leading-tight">
            Target Band
          </span>
        </div>
        <span className={`text-lg font-bold tabular-nums shrink-0 ${
          hasBand ? "text-white" : "text-white/30"
        }`}>
          {hasBand ? band : "—"}
        </span>
      </div>

      {/* Band scale bar */}
      <div className="-mt-1 space-y-1">
        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: hasBand ? `${pct}%` : "0%" }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-white/25 tabular-nums">
          <span>1</span>
          <span>6</span>
          <span>12</span>
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/settings?tab=goal"
        className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-primary py-2 text-xs font-bold text-[#0D0D0D] hover:bg-primary-hover transition-all duration-200 shadow-[0_2px_10px_rgba(200,150,62,0.25)] hover:shadow-[0_4px_16px_rgba(200,150,62,0.40)] mt-auto"
      >
        {hasBand ? "Update goal" : "Set goal"}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </CardShell>
  );
}
