import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Filter, GitMerge, Layers, ArrowDownAZ, Columns3, Database, FunctionSquare, Code2 } from "lucide-react";
import type { StageNodeData, StageType } from "@/types/pipeline";
import { STAGE_COLORS } from "@/types/pipeline";
import { cn } from "@/lib/utils";

const STAGE_ICONS: Record<StageType, typeof Filter> = {
  LOAD: Database,
  FILTER: Filter,
  JOIN: GitMerge,
  UNION: Layers,
  GROUP: FunctionSquare,
  SORT: ArrowDownAZ,
  SELECT: Columns3,
  CUSTOM: Code2,
};

const EXEC_BADGE: Record<NonNullable<StageNodeData["executionState"]>, string> = {
  pending: "bg-amber-50 text-amber-700",
  running: "bg-blue-50 text-blue-700 animate-pulse",
  success: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
};

type StageNodeType = Node<StageNodeData, "stageNode">;

function StageNodeImpl({ data, selected }: NodeProps<StageNodeType>) {
  const color = STAGE_COLORS[data.stageType];
  const Icon = STAGE_ICONS[data.stageType];

  return (
    <div
      className={cn(
        "min-w-[200px] rounded-md border-2 bg-white p-3 shadow-sm transition-shadow",
        selected ? "ring-2 ring-blue-400 ring-offset-2" : "hover:shadow-md",
      )}
      style={{ borderColor: color }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-gray-300 !bg-white"
      />

      <div className="flex items-start gap-2">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color }}
            >
              {data.stageType}
            </span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              #{data.stageIndex}
            </span>
          </div>
          <div className="mt-1 truncate text-sm text-gray-800">{data.label}</div>
          {data.outputTableName && (
            <div className="mt-1 truncate text-[11px] text-gray-500">
              → {data.outputTableName}
            </div>
          )}
          {data.executionState && (
            <span
              className={cn(
                "mt-2 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                EXEC_BADGE[data.executionState],
              )}
            >
              {data.executionState}
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-gray-300 !bg-white"
      />
    </div>
  );
}

export const StageNode = memo(StageNodeImpl);
