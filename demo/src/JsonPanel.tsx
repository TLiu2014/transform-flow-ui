import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface JsonPanelProps {
  data: unknown;
}

export function JsonPanel({ data }: JsonPanelProps) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable; ignore */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
        <span className="text-xs text-gray-600">
          Live pipeline schema (data-engineer view)
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-7 items-center gap-1.5 rounded border border-gray-300 bg-white px-2 text-[11px] font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy JSON
            </>
          )}
        </button>
      </div>
      <pre className="flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-relaxed text-gray-100">
        <code>{json}</code>
      </pre>
    </div>
  );
}
