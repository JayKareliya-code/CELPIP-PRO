"use client";

import { useState } from "react";
import { ShoppingCart, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { BillingSelect } from "./BillingSelect";
import { buildCartItem } from "./AddonCard";
import type { CartItem } from "@/store/billingCartStore";
import type { AddonCardConfig } from "./AddonCard";

interface AddonRowProps {
  config:      AddonCardConfig;
  onAddToCart: (item: Omit<CartItem, "quantity">) => void;
}

export function AddonRow({ config, onAddToCart }: AddonRowProps) {
  const {
    icon, iconBg, name, price, description,
    taskOptions, moduleTaskOptions, disabled,
  } = config;

  const taskKeys    = taskOptions ? Object.keys(taskOptions) : [];
  const moduleNames = moduleTaskOptions ? Object.keys(moduleTaskOptions) : [];

  const [selectedTask, setSelectedTask]             = useState(taskKeys[0] ?? "");
  const [selectedModule, setSelectedModule]         = useState(moduleNames[0] ?? "");
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
    onAddToCart(buildCartItem(config, selectedModule, selectedModuleTask, selectedTask));
  };

  return (
    <div
      className={cn(
        "rounded-xl border flex flex-col gap-3 transition-all duration-200 p-4",
        disabled ? "border-white/[0.04] opacity-50" : "border-white/[0.10] hover:border-white/[0.16]",
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-white/90 leading-none">{name}</h3>
            <span className="text-lg font-bold text-white/90 shrink-0 tabular-nums">
              ${price.toFixed(2)}{" "}
              <span className="text-[10px] text-white/30 font-normal">CAD</span>
            </span>
          </div>
          <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>

      {moduleTaskOptions && (
        <div className="space-y-1.5">
          <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
            {moduleNames.map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => handleModuleChange(mod)}
                disabled={disabled}
                className={cn(
                  "flex-1 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed",
                  selectedModule === mod ? "bg-amber-500 text-black" : "text-white/40 hover:text-white/70",
                )}
              >
                {mod}
              </button>
            ))}
          </div>
          <BillingSelect
            value={selectedModuleTask}
            onChange={setSelectedModuleTask}
            disabled={disabled}
            options={Object.entries(currentModuleTasks).map(([key, label]) => ({ key, label }))}
          />
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={disabled}
        title={disabled ? "Upgrade to Pro to purchase add-ons" : undefined}
        className={cn(
          "w-full flex items-center justify-center gap-1.5 py-2 rounded-lg",
          "text-xs font-semibold transition-all duration-200 border",
          disabled
            ? "border-white/[0.04] text-white/20 cursor-not-allowed"
            : "border-amber-500/40 text-amber-400 hover:border-amber-500/70 hover:bg-amber-500/[0.06]",
        )}
      >
        {disabled
          ? <><Lock className="w-3 h-3" /> Requires Pro</>
          : <><ShoppingCart className="w-3 h-3" /> Add to cart</>
        }
      </button>
    </div>
  );
}
