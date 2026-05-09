import { useMemo } from "react";
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";

import { StageConfigUI } from "@/components/config/StageConfigUI";
import type { StageNodeData } from "@/types/Pipeline";
import { STAGE_COLORS } from "@/types/Pipeline";
import {
  DEFAULT_EDGE_SOURCE_HANDLE_ID,
  DEFAULT_EDGE_TARGET_HANDLE_ID,
} from "./StageEdgeHandles";
import { GradientEdge } from "./GradientEdge";
import { NodeToolbarPositionProvider } from "./NodeToolbarPositionContext";
import { PopoverStageEditor } from "./PopoverStageEditor";
import { StageNode } from "./StageNode";
import {
  StageNodeContext,
  type StageNodeCallbacks,
} from "./StageNodeContext";

export interface TransformationFlowProps {
  nodes: Node<StageNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<StageNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onNodeClick: (node: Node<StageNodeData>) => void;
  onNodeDoubleClick?: (node: Node<StageNodeData>) => void;
  onPaneClick?: () => void;
  selectedNodeId: string | null;
  /** Called when the user clicks the output-table link on a node. */
  onShowOutput?: (stageId: string) => void;
  /** Called when the user clicks the pencil/edit icon on a node. */
  onEditNode?: (stageId: string) => void;
  /**
   * Where the floating popover attaches relative to the selected node.
   * Only relevant in "popover" configDisplayMode.
   */
  nodeToolbarPosition?: Position;

  // ── Edit panel ──────────────────────────────────────────────────────────
  /** The node currently open for editing, or null/undefined for none. */
  editingNode?: Node<StageNodeData> | null;
  /**
   * "popover" — the edit form floats next to the node on the canvas.
   * "panel"   — the edit form is fixed in a right-side panel.
   * Defaults to "popover".
   */
  configDisplayMode?: "popover" | "panel";
  onUpdateNode?: (id: string, patch: Partial<StageNodeData>) => void;
  onDeleteNode?: (id: string) => void;
  onCancelEdit?: () => void;
  confirmBeforeDelete?: boolean;
}

const nodeTypes: NodeTypes = { stageNode: StageNode };
const edgeTypes: EdgeTypes = { gradient: GradientEdge };

export function TransformationFlow({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  selectedNodeId,
  onShowOutput,
  onEditNode,
  nodeToolbarPosition = Position.Right,
  editingNode,
  configDisplayMode = "popover",
  onUpdateNode,
  onDeleteNode,
  onCancelEdit,
  confirmBeforeDelete = true,
}: TransformationFlowProps) {
  const decoratedNodes = useMemo(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId })),
    [nodes, selectedNodeId],
  );

  const resolvedEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        sourceHandle: e.sourceHandle ?? DEFAULT_EDGE_SOURCE_HANDLE_ID,
        targetHandle: e.targetHandle ?? DEFAULT_EDGE_TARGET_HANDLE_ID,
      })),
    [edges],
  );

  const callbacks = useMemo<StageNodeCallbacks>(
    () => ({ onShowOutput, onEdit: onEditNode }),
    [onShowOutput, onEditNode],
  );

  return (
    <StageNodeContext.Provider value={callbacks}>
      <NodeToolbarPositionProvider value={nodeToolbarPosition}>
        <div className="flex h-full min-h-0">
          <div className="relative min-w-0 flex-1">
            <ReactFlow
              nodes={decoratedNodes}
              edges={resolvedEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) =>
                onNodeClick(node as Node<StageNodeData>)
              }
              onNodeDoubleClick={
                onNodeDoubleClick
                  ? (_, node) =>
                      onNodeDoubleClick(node as Node<StageNodeData>)
                  : undefined
              }
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: "gradient" }}
              connectionMode={ConnectionMode.Loose}
              onInit={(instance) =>
                requestAnimationFrame(() =>
                  instance.fitView({ padding: 0.1 }),
                )
              }
              proOptions={{ hideAttribution: true }}
              className="h-full w-full"
            >
              <Background color="#e5e7eb" gap={16} />
              <Controls className="!shadow-md" />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) => {
                  const data = n.data as StageNodeData | undefined;
                  return data ? STAGE_COLORS[data.stageType] : "#9ca3af";
                }}
                className="!bg-white"
              />
              {configDisplayMode === "popover" &&
                editingNode &&
                onUpdateNode &&
                onDeleteNode && (
                  <PopoverStageEditor
                    node={editingNode}
                    onUpdate={onUpdateNode}
                    onDelete={onDeleteNode}
                    onCancel={onCancelEdit ?? (() => {})}
                    confirmBeforeDelete={confirmBeforeDelete}
                  />
                )}
            </ReactFlow>
          </div>

          {configDisplayMode === "panel" && (
            <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white">
              <StageConfigUI
                node={editingNode ?? null}
                onUpdate={onUpdateNode ?? (() => {})}
                onDelete={onDeleteNode ?? (() => {})}
                onCancel={onCancelEdit}
                confirmBeforeDelete={confirmBeforeDelete}
              />
            </div>
          )}
        </div>
      </NodeToolbarPositionProvider>
    </StageNodeContext.Provider>
  );
}
