import { useEffect, useRef, useState } from "react";
import {
  Settings,
  Check,
  PanelRight,
  Pin,
  LayoutList,
  Columns2,
  Rows2,
} from "lucide-react";

export type ConfigDisplayMode = "panel" | "popover";
export type BottomPanelLayout = "tabs" | "split";
export type MainLayout = "top-bottom" | "left-right";

export interface AppSettings {
  configDisplayMode: ConfigDisplayMode;
  bottomPanelLayout: BottomPanelLayout;
  /** Flow canvas vs results area: stacked top–bottom, or split left–right. */
  mainLayout: MainLayout;
  /** When true, deleting a stage opens a confirmation dialog first. */
  confirmBeforeDelete: boolean;
  /** When true, the canvas adds animated rings for node executionState. */
  richExecutionState: boolean;
}

interface SettingsMenuProps {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export function SettingsMenu({ settings, onChange }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg"
        >
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Stage configuration (edit view)
          </div>
          <ModeOption
            active={settings.configDisplayMode === "panel"}
            icon={PanelRight}
            label="Fixed right panel"
            description="Persistent sidebar for the selected stage"
            onClick={() => {
              onChange({ configDisplayMode: "panel" });
            }}
          />
          <ModeOption
            active={settings.configDisplayMode === "popover"}
            icon={Pin}
            label="Pinned to node"
            description="Floating panel beside the selected node"
            onClick={() => {
              onChange({ configDisplayMode: "popover" });
            }}
          />

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Flow canvas / results layout
          </div>
          <ModeOption
            active={settings.mainLayout === "top-bottom"}
            icon={Rows2}
            label="Top–bottom"
            description="Flow above, results below"
            onClick={() => {
              onChange({ mainLayout: "top-bottom" });
            }}
          />
          <ModeOption
            active={settings.mainLayout === "left-right"}
            icon={Columns2}
            label="Left–right"
            description="Flow on the left, results on the right"
            onClick={() => {
              onChange({ mainLayout: "left-right" });
            }}
          />

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Data schema / Pipeline JSON
          </div>
          <ModeOption
            active={settings.bottomPanelLayout === "tabs"}
            icon={LayoutList}
            label="Tabs"
            description="Show one panel at a time; switch with tabs"
            onClick={() => {
              onChange({ bottomPanelLayout: "tabs" });
            }}
          />
          <ModeOption
            active={settings.bottomPanelLayout === "split"}
            icon={Columns2}
            label="Side by side"
            description="Data schema and Pipeline JSON together"
            onClick={() => {
              onChange({ bottomPanelLayout: "split" });
            }}
          />

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Safety
          </div>
          <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              checked={settings.confirmBeforeDelete}
              onChange={(e) =>
                onChange({ confirmBeforeDelete: e.target.checked })
              }
            />
            <span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Confirm before delete
              </span>
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                Show a dialog when removing a stage from the canvas
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              checked={settings.richExecutionState}
              onChange={(e) =>
                onChange({ richExecutionState: e.target.checked })
              }
            />
            <span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Rich execution-state visuals
              </span>
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                Pulsing/colored rings on nodes when executionState is set
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

interface ModeOptionProps {
  active: boolean;
  icon: typeof Settings;
  label: string;
  description: string;
  onClick: () => void;
}

function ModeOption({
  active,
  icon: Icon,
  label,
  description,
  onClick,
}: ModeOptionProps) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
      </div>
      {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />}
    </button>
  );
}
