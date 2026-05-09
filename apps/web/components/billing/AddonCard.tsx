"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { BillingSelect } from "./BillingSelect";
import type { CartItem, CartItemType } from "@/store/billingCartStore";

export interface AddonCardConfig {
  id:                 string;
  cartType:           CartItemType;
  icon:               React.ReactNode;
  iconBg:             string;
  name:               string;
  price:              number;
  quantityLabel:      string;
  description:        string;
  taskOptions?:       Record<string, string>;
  mockTestOptions?:   Record<string, string>;  // mock_bundle: slot number → label
  moduleTaskOptions?: Record<string, Record<string, string>>;
  disabled?:          boolean;
}

interface AddonCardProps {
  config:      AddonCardConfig;
  onAddToCart: (item: Omit<CartItem, "quantity">) => void;
}

/** Builds the cart item payload from the current selector state. */
export function buildCartItem(
  config: AddonCardConfig,
  selectedModule: string,
  selectedModuleTask: string,
  selectedTask: string,
  selectedMockTest: string = "",
): Omit<CartItem, "quantity"> {
  const { id, cartType, name, price, quantityLabel, taskOptions, mockTestOptions, moduleTaskOptions } = config;

  // mock_bundle: encode mock_test_number as string metadata
  if (cartType === "mock_bundle" && mockTestOptions && selectedMockTest) {
    const label = mockTestOptions[selectedMockTest] ?? selectedMockTest;
    return {
      id:        `${id}-${selectedMockTest}`,
      type:      "mock_bundle",
      name,
      subtitle:  label,
      unitPrice: price,
      currency:  "CAD",
      // mock_test_number must be a string (Record<string,string>)
      metadata:  { mock_test_number: selectedMockTest, mock_test_label: label },
    };
  }

  if (moduleTaskOptions && selectedModuleTask) {
    const label = moduleTaskOptions[selectedModule]?.[selectedModuleTask] ?? selectedModuleTask;
    return {
      id:        `${id}-${selectedModuleTask}`,
      type:      "custom_bundle",
      name,
      subtitle:  `${selectedModule} · ${label}`,
      unitPrice: price,
      currency:  "CAD",
      // task_key (snake_case) matches backend CartItemRequest.metadata.task_key
      metadata:  { module: selectedModule, task_key: selectedModuleTask, task_label: label },
    };
  }

  if (taskOptions && selectedTask) {
    return {
      id:        `${id}-${selectedTask}`,
      type:      cartType,
      name,
      subtitle:  taskOptions[selectedTask] ?? quantityLabel,
      unitPrice: price,
      currency:  "CAD",
      metadata:  { task_key: selectedTask, task_label: taskOptions[selectedTask] ?? "" },
    };
  }

  return { id, type: cartType, name, subtitle: quantityLabel, unitPrice: price, currency: "CAD", metadata: {} };
}

export function AddonCard({ config, onAddToCart }: AddonCardProps) {
  const {
    id, icon, iconBg, name, price, quantityLabel,
    description, taskOptions, mockTestOptions, moduleTaskOptions, disabled,
  } = config;

  const taskKeys    = taskOptions     ? Object.keys(taskOptions)     : [];
  const mockKeys    = mockTestOptions ? Object.keys(mockTestOptions) : [];
  const moduleNames = moduleTaskOptions ? Object.keys(moduleTaskOptions) : [];

  const [selectedTask, setSelectedTask]         = useState(taskKeys[0] ?? "");
  const [selectedMockTest, setSelectedMockTest] = useState(mockKeys[0] ?? "");
  const [selectedModule, setSelectedModule]     = useState(moduleNames[0] ?? "");
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

  return (
    <div
      className={cn(
        "rounded-xl border flex flex-col gap-4 transition-all duration-200 h-full p-5",
        disabled ? "border-white/[0.04] opacity-50" : "border-white/[0.10] hover:border-white/[0.16]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border", iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white/90 leading-snug">{name}</h3>
          <p className="text-xs text-white/35 font-medium mt-0.5">{quantityLabel}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-white/90 tabular-nums">${price.toFixed(2)}</p>
          <p className="text-[10px] text-white/30">CAD</p>
        </div>
      </div>

      <p className="text-xs text-white/40 leading-relaxed">{description}</p>

      {/* Mock test slot selector */}
      {mockTestOptions && (
        <BillingSelect
          value={selectedMockTest}
          onChange={setSelectedMockTest}
          disabled={disabled}
          options={mockKeys.map((key) => ({ key, label: mockTestOptions[key] }))}
        />
      )}

      {taskOptions && (
        <BillingSelect
          value={selectedTask}
          onChange={setSelectedTask}
          disabled={disabled}
          options={taskKeys.map((key) => ({ key, label: taskOptions[key] }))}
        />
      )}

      {moduleTaskOptions && (
        <div className="space-y-2">
          <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
            {moduleNames.map((mod) => (
              <button
                key={mod}
                id={`billing-custom-module-${mod.toLowerCase()}`}
                type="button"
                onClick={() => handleModuleChange(mod)}
                disabled={disabled}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed",
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

      <div className="flex-1" />

      <button
        id={`billing-addon-${id}-add`}
        onClick={handleAdd}
        disabled={disabled}
        title={disabled ? "Upgrade to Pro to purchase add-ons" : undefined}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg",
          "border text-sm font-medium transition-all duration-200",
          disabled
            ? "border-white/[0.04] text-white/20 cursor-not-allowed"
            : "border-amber-500/40 text-amber-400 hover:border-amber-500/70 hover:bg-amber-500/[0.06]",
        )}
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        {disabled ? "Requires Pro" : "Add to cart"}
      </button>
    </div>
  );
}
