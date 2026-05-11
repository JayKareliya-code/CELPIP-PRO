"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BillingSelect } from "./BillingSelect";
import { buildCartItem } from "./AddonCard";
import type { CartItem } from "@/store/billingCartStore";
import type { AddonCardConfig } from "./AddonCard";

interface AddonRowProps {
  config: AddonCardConfig;
  onAddToCart: (item: Omit<CartItem, "quantity">) => void;
}

export function AddonRow({ config, onAddToCart }: AddonRowProps) {
  const {
    id, icon, iconBg, name, price, quantityLabel,
    taskOptions, mockTestOptions, moduleTaskOptions, disabled,
  } = config;

  const taskKeys = taskOptions ? Object.keys(taskOptions) : [];
  const mockKeys = mockTestOptions ? Object.keys(mockTestOptions) : [];
  const moduleNames = moduleTaskOptions ? Object.keys(moduleTaskOptions) : [];

  const [selectedTask, setSelectedTask] = useState(taskKeys[0] ?? "");
  const [selectedMockTest, setSelectedMockTest] = useState(mockKeys[0] ?? "");
  const [selectedModule, setSelectedModule] = useState(moduleNames[0] ?? "");
  const [selectedModuleTask, setSelectedModuleTask] = useState(
    () => Object.keys(moduleTaskOptions?.[moduleNames[0] ?? ""] ?? {})[0] ?? "",
  );

  const currentModuleTasks = moduleTaskOptions?.[selectedModule] ?? {};

  const handleModuleChange = (mod: string) => {
    setSelectedModule(mod);
    setSelectedModuleTask(Object.keys(moduleTaskOptions?.[mod] ?? {})[0] ?? "");
  };

  const handleAdd = () => {
    if (disabled) return;
    onAddToCart(buildCartItem(config, selectedModule, selectedModuleTask, selectedTask, selectedMockTest));
  };

  const hasSelector = !!(mockTestOptions || taskOptions || moduleTaskOptions);

  return (
    <div
      id={`billing-addon-${id}`}
      className={cn(
        "relative rounded-xl border flex flex-col transition-all duration-200 h-full bg-surface",
        disabled
          ? "border-white/[0.06] opacity-50"
          : "border-white/[0.14] hover:border-white/[0.22]",
      )}
    >
      {/* ── Header: Icon + Title + Price ─────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-5 space-y-3">

        {/* Icon + Name */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
            iconBg,
          )}>
            {icon}
          </div>
          <h3 className="text-sm font-semibold text-white/80 leading-snug tracking-tight">
            {name}
          </h3>
        </div>

        {/* Price + label */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white tabular-nums leading-none">
              ${price.toFixed(2)}
            </span>
            <span className="text-[11px] font-medium text-white/35 tracking-wide">CAD</span>
          </div>
          <p className="text-[11px] text-white/35 mt-1">One-time purchase</p>
        </div>
      </div>

      {/* ── Full-width Divider ───────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.08]" />

      {/* ── Quantity label ───────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 flex flex-col gap-1.5">
        {quantityLabel.map((pt) => (
          <div key={pt} className="flex items-center gap-2.5">
            <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="text-sm text-white/85 font-medium">{pt}</span>
          </div>
        ))}
      </div>

      {/* ── Selector(s) ─────────────────────────────────────────────────────── */}
      {hasSelector && (
        <div className="px-5 pb-4 space-y-2">
          {/* Mock test slot selector */}
          {mockTestOptions && (
            <BillingSelect
              value={selectedMockTest}
              onChange={setSelectedMockTest}
              disabled={disabled}
              options={mockKeys.map((key) => ({ key, label: mockTestOptions[key] }))}
            />
          )}

          {/* Simple task selector */}
          {taskOptions && (
            <BillingSelect
              value={selectedTask}
              onChange={setSelectedTask}
              disabled={disabled}
              options={taskKeys.map((key) => ({ key, label: taskOptions[key] }))}
            />
          )}

          {/* Module toggle + task dropdown */}
          {moduleTaskOptions && (
            <div className="space-y-2">
              {/* Speaking / Writing pill toggle */}
              <div className="flex rounded-lg overflow-hidden border border-white/[0.10]">
                {moduleNames.map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => handleModuleChange(mod)}
                    disabled={disabled}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed",
                      selectedModule === mod
                        ? "bg-primary text-primary-foreground"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
                    )}
                  >
                    {mod}
                  </button>
                ))}
              </div>

              {/* Task dropdown */}
              <BillingSelect
                value={selectedModuleTask}
                onChange={setSelectedModuleTask}
                disabled={disabled}
                options={Object.entries(currentModuleTasks).map(([key, label]) => ({ key, label }))}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Spacer — pushes CTA flush to card bottom ─────────────────────────── */}
      <div className="flex-1" />

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <div className="px-5 pb-5 pt-1">
        <button
          id={`billing-addon-${id}-add`}
          onClick={handleAdd}
          disabled={disabled}
          title={disabled ? "Upgrade to Pro to purchase add-ons" : undefined}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm",
            "transition-all duration-200 border",
            disabled
              ? "border-white/[0.08] text-white/20 cursor-not-allowed"
              : "border-primary/40 text-primary hover:border-primary hover:bg-primary/[0.08] active:scale-[0.98]",
          )}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          {disabled ? "Requires Pro" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
