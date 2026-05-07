import { useState } from "react";
import { Check, Copy, Download, RefreshCw } from "lucide-react";
import type { PipelineSchema } from "@/schema";

export interface JsonViewProps {
  schema: PipelineSchema;
  /**
   * Bumped externally to signal "the schema you're showing is the latest
   * snapshot." Useful so the user gets visible feedback after pressing
   * Refresh — the panel briefly flashes a tick.
   */
  refreshTick: number;
  onRefresh: () => void;
}

export function JsonView({ schema, refreshTick, onRefresh }: JsonViewProps) {
  const json = JSON.stringify(schema, null, 2);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable; ignore */
    }
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schema.pipeline.name || "pipeline"}-schema.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-gray-600">
          <span className="font-mono text-gray-900">
            {schema.pipeline.name}
          </span>
          <span>·</span>
          <span>{schema.stages.length} stages</span>
          <span>·</span>
          <span>{Object.keys(schema.datasets).length} datasets</span>
          <span className="hidden text-gray-400 sm:inline">
            · synced #{refreshTick}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ToolbarButton onClick={onRefresh} icon={RefreshCw}>
            Refresh
          </ToolbarButton>
          <ToolbarButton onClick={handleDownload} icon={Download}>
            Download
          </ToolbarButton>
          <ToolbarButton
            onClick={handleCopy}
            icon={copied ? Check : Copy}
            highlight={copied}
          >
            {copied ? "Copied" : "Copy"}
          </ToolbarButton>
        </div>
      </header>
      <pre className="flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-relaxed text-gray-100">
        <code>{json}</code>
      </pre>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  icon: typeof Copy;
  children: React.ReactNode;
  highlight?: boolean;
}

function ToolbarButton({
  onClick,
  icon: Icon,
  children,
  highlight,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex h-7 items-center gap-1 rounded border px-2 text-[11px] font-medium shadow-sm " +
        (highlight
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50")
      }
    >
      <Icon className="h-3 w-3" />
      <span>{children}</span>
    </button>
  );
}
