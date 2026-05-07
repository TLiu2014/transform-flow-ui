import { useEffect, useRef, useState } from "react";
import {
  Settings,
  Check,
  PanelRight,
  Pin,
  LayoutList,
  Columns2,
} from "lucide-react";

export type ConfigDisplayMode = "panel" | "popover";
export type BottomPanelLayout = "tabs" | "split";

export interface AppSettings {
  configDisplayMode: ConfigDisplayMode;
  bottomPanelLayout: BottomPanelLayout;
  /** When true, deleting a stage opens a confirmation dialog first. */
  confirmBeforeDelete: boolean;
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900"
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
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

          <div className="my-1 border-t border-gray-100" />

          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
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

          <div className="my-1 border-t border-gray-100" />

          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Safety
          </div>
          <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
              checked={settings.confirmBeforeDelete}
              onChange={(e) =>
                onChange({ confirmBeforeDelete: e.target.checked })
              }
            />
            <span>
              <span className="font-medium text-gray-900">
                Confirm before delete
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                Show a dialog when removing a stage from the canvas
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
      className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />}
    </button>
  );
}
