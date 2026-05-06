import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { StageNode } from "./StageNode";
import type { StageNodeData } from "@/types/pipeline";
import { STAGE_COLORS } from "@/types/pipeline";

interface TransformationFlowProps {
  nodes: Node<StageNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<StageNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onNodeClick: (node: Node<StageNodeData>) => void;
  onPaneClick?: () => void;
  selectedNodeId: string | null;
}

const nodeTypes: NodeTypes = { stageNode: StageNode };

export function TransformationFlow({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  selectedNodeId,
}: TransformationFlowProps) {
  const decoratedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId],
  );

  return (
    <ReactFlow
      nodes={decoratedNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, node) => onNodeClick(node as Node<StageNodeData>)}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={{
        type: "smoothstep",
        animated: false,
        style: { strokeWidth: 2, stroke: "#9ca3af" },
      }}
      fitView
      proOptions={{ hideAttribution: true }}
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
    </ReactFlow>
  );
}
