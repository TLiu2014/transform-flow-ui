import { useMemo, type ReactNode } from "react";
import {
  Background,
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

import { StageNode } from "./StageNode";
import { GradientEdge } from "./GradientEdge";
import { NodeToolbarPositionProvider } from "./node-toolbar-position-context";
import {
  StageNodeContext,
  type StageNodeCallbacks,
} from "./stage-node-context";
import type { StageNodeData } from "@/types/pipeline";
import { STAGE_COLORS } from "@/types/pipeline";

interface TransformationFlowProps {
  nodes: Node<StageNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<StageNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onNodeClick: (node: Node<StageNodeData>) => void;
  onNodeDoubleClick?: (node: Node<StageNodeData>) => void;
  onPaneClick?: () => void;
  selectedNodeId: string | null;
  /**
   * Called when the user clicks the output-table link on a node. Useful for
   * switching a "Data Schema" tab to that stage's output.
   */
  onShowOutput?: (stageId: string) => void;
  /**
   * Called when the user clicks a node's edit (pencil) icon. Decoupled from
   * onNodeClick so callers can suppress single-click editing (e.g. popover
   * mode) while keeping an explicit affordance.
   */
  onEditNode?: (stageId: string) => void;
  /**
   * Children are rendered inside the React Flow canvas, below the built-in
   * Background/Controls/MiniMap. Use this to mount components that require
   * the React Flow context, e.g. NodeToolbar.
   */
  children?: ReactNode;
  /**
   * Where the floating edit panel attaches relative to the selected node
   * (used with `NodeToolbar` + {@link useNodeToolbarPosition}).
   */
  nodeToolbarPosition?: Position;
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
  children,
  nodeToolbarPosition = Position.Right,
}: TransformationFlowProps) {
  const decoratedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId],
  );

  const callbacks = useMemo<StageNodeCallbacks>(
    () => ({ onShowOutput, onEdit: onEditNode }),
    [onShowOutput, onEditNode],
  );

  return (
    <StageNodeContext.Provider value={callbacks}>
      <NodeToolbarPositionProvider value={nodeToolbarPosition}>
      <ReactFlow
        nodes={decoratedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick(node as Node<StageNodeData>)}
        onNodeDoubleClick={
          onNodeDoubleClick
            ? (_, node) => onNodeDoubleClick(node as Node<StageNodeData>)
            : undefined
        }
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "gradient" }}
        fitView
        proOptions={{ hideAttribution: true }}
        className="h-full w-full min-h-0"
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
        {children}
      </ReactFlow>
      </NodeToolbarPositionProvider>
    </StageNodeContext.Provider>
  );
}
