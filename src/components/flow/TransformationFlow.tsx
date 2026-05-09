import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";

import { StageConfigUI } from "@/components/config/StageConfigUI";
import { deserializePipeline, serializePipeline, type PipelineSchema } from "@/Schema";
import { STAGE_COLORS, STAGE_LABELS, defaultConfigFor, type StageNodeData, type StageType } from "@/types/Pipeline";
import {
  DEFAULT_EDGE_SOURCE_HANDLE_ID,
  DEFAULT_EDGE_TARGET_HANDLE_ID,
} from "./StageEdgeHandles";
import { GradientEdge } from "./GradientEdge";
import { NodeToolbarPositionProvider } from "./NodeToolbarPositionContext";
import { PopoverStageEditor } from "./PopoverStageEditor";
import { StageNode } from "./StageNode";
import { StageNodeContext, type StageNodeCallbacks } from "./StageNodeContext";

export interface TransformationFlowHandle {
  /** Adds a new stage node to the canvas and opens its edit form. */
  addStage: (stageType: StageType) => void;
}

export interface TransformationFlowProps {
  /**
   * Pipeline to load onto the canvas. When this reference changes (e.g. the
   * host loads a new sample), the canvas re-initializes. Changes caused by
   * the user editing the canvas do NOT trigger a reload — only genuinely new
   * schemas from outside do.
   */
  schema?: PipelineSchema | null;
  /** Fires after every meaningful user edit (drag-stop, connect, config save, delete). */
  onChange?: (schema: PipelineSchema) => void;
  /** Called when the user clicks a stage's output-table link. */
  onShowOutput?: (stageId: string) => void;
  /**
   * "popover" — the edit form floats next to the node on the canvas.
   * "panel"   — the edit form is pinned as a right sidebar.
   * Defaults to "popover".
   */
  configDisplayMode?: "popover" | "panel";
  /** Which side the popover attaches to (default Right). */
  nodeToolbarPosition?: Position;
  confirmBeforeDelete?: boolean;
}

const nodeTypes: NodeTypes = { stageNode: StageNode };
const edgeTypes: EdgeTypes = { gradient: GradientEdge };

function withDefaultHandles(e: Edge): Edge {
  return {
    ...e,
    sourceHandle: e.sourceHandle ?? DEFAULT_EDGE_SOURCE_HANDLE_ID,
    targetHandle: e.targetHandle ?? DEFAULT_EDGE_TARGET_HANDLE_ID,
  };
}

export const TransformationFlow = forwardRef<
  TransformationFlowHandle,
  TransformationFlowProps
>(function TransformationFlow(
  {
    schema,
    onChange,
    onShowOutput,
    configDisplayMode = "popover",
    nodeToolbarPosition = Position.Right,
    confirmBeforeDelete = true,
  },
  ref,
) {
  const [nodes, setNodes] = useState<Node<StageNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Refs always hold the latest render values — safe to use in callbacks.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const pipelineNameRef = useRef(schema?.pipeline.name ?? "pipeline");
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Tracks the last schema we emitted so we don't re-init the canvas on our
  // own onChange round-trips from the host.
  const lastEmitted = useRef<PipelineSchema | null>(null);

  // Load (or reload) from the schema prop — only when it's a genuinely new
  // schema from outside, not one we emitted ourselves.
  useEffect(() => {
    if (!schema) return;
    if (schema === lastEmitted.current) return;
    const { name, nodes: newNodes, edges: newEdges } = deserializePipeline(schema);
    pipelineNameRef.current = name;
    setNodes(newNodes);
    // Resolve default handle IDs on load so emitted schemas are complete.
    setEdges(newEdges.map(withDefaultHandles));
    setSelectedNodeId(null);
    setEditingNodeId(null);
  }, [schema]);

  const emit = useCallback(
    (emitNodes: Node<StageNodeData>[], emitEdges: Edge[]) => {
      if (!onChange) return;
      const s = serializePipeline(emitNodes, emitEdges, {
        name: pipelineNameRef.current,
      });
      lastEmitted.current = s;
      onChange(s);
    },
    [onChange],
  );

  // ── Canvas event handlers ────────────────────────────────────────────────

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<StageNodeData>>[]) => {
      const removes = changes.filter((c) => c.type === "remove");
      const others = changes.filter((c) => c.type !== "remove");

      if (removes.length > 0) {
        const removedIds = new Set(removes.map((c) => c.id));
        // Apply any non-remove changes first, then filter out removed nodes.
        const afterOthers =
          others.length > 0
            ? (applyNodeChanges(others, nodesRef.current) as Node<StageNodeData>[])
            : nodesRef.current;
        const newNodes = afterOthers.filter((n) => !removedIds.has(n.id));
        const newEdges = edgesRef.current.filter(
          (e) => !removedIds.has(e.source) && !removedIds.has(e.target),
        );
        setNodes(newNodes);
        setEdges(newEdges);
        setSelectedNodeId((cur) => (cur && removedIds.has(cur) ? null : cur));
        setEditingNodeId((cur) => (cur && removedIds.has(cur) ? null : cur));
        emit(newNodes, newEdges);
      } else {
        setNodes((ns) => applyNodeChanges(others, ns) as Node<StageNodeData>[]);
      }
    },
    [emit],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removes = changes.filter((c) => c.type === "remove");
      const others = changes.filter((c) => c.type !== "remove");

      if (removes.length > 0) {
        const removedIds = new Set(removes.map((c) => c.id));
        const baseEdges =
          others.length > 0
            ? applyEdgeChanges(others, edgesRef.current)
            : edgesRef.current;
        const newEdges = baseEdges.filter((e) => !removedIds.has(e.id));
        setEdges(newEdges);
        emit(nodesRef.current, newEdges);
      } else {
        setEdges((es) => applyEdgeChanges(others, es));
      }
    },
    [emit],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(
        withDefaultHandles({ ...connection, type: "gradient" } as Edge),
        edgesRef.current,
      );
      setEdges(newEdges);
      emit(nodesRef.current, newEdges);
    },
    [emit],
  );

  // ── Node interaction ─────────────────────────────────────────────────────

  const handleNodeClick = (node: Node<StageNodeData>) => {
    setSelectedNodeId(node.id);
    if (configDisplayMode === "panel") setEditingNodeId(node.id);
  };

  const handleNodeDoubleClick = (node: Node<StageNodeData>) => {
    setSelectedNodeId(node.id);
    setEditingNodeId(node.id);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
    if (configDisplayMode !== "popover") setEditingNodeId(null);
  };

  const handleEditNode = (stageId: string) => {
    setSelectedNodeId(stageId);
    setEditingNodeId(stageId);
  };

  // ── Config panel mutations ───────────────────────────────────────────────

  const handleUpdateNode = useCallback(
    (id: string, patch: Partial<StageNodeData>) => {
      const newNodes = nodesRef.current.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      );
      setNodes(newNodes);
      emit(newNodes, edgesRef.current);
    },
    [emit],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const newNodes = nodesRef.current.filter((n) => n.id !== id);
      const newEdges = edgesRef.current.filter(
        (e) => e.source !== id && e.target !== id,
      );
      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNodeId((cur) => (cur === id ? null : cur));
      setEditingNodeId((cur) => (cur === id ? null : cur));
      emit(newNodes, newEdges);
    },
    [emit],
  );

  // ── Imperative handle (addStage) ─────────────────────────────────────────

  useImperativeHandle(
    ref,
    () => ({
      addStage: (stageType: StageType) => {
        const id = `n${Date.now().toString(36)}`;
        const stageIndex = nodesRef.current.length + 1;
        const newNode: Node<StageNodeData> = {
          id,
          type: "stageNode",
          position: {
            x: 80 + (stageIndex % 3) * 60,
            y: 80 + stageIndex * 80,
          },
          data: {
            stageType,
            label: `${STAGE_LABELS[stageType]} #${stageIndex}`,
            stageIndex,
            config: defaultConfigFor(stageType),
            outputTableName: `${stageType.toLowerCase()}_${stageIndex}`,
          },
        };
        const newNodes = [...nodesRef.current, newNode];
        setNodes(newNodes);
        setSelectedNodeId(id);
        setEditingNodeId(id);
        emit(newNodes, edgesRef.current);
      },
    }),
    [emit],
  );

  // ── Derived state for render ─────────────────────────────────────────────

  const editingNode = useMemo(
    () => nodes.find((n) => n.id === editingNodeId) ?? null,
    [nodes, editingNodeId],
  );

  const decoratedNodes = useMemo(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId })),
    [nodes, selectedNodeId],
  );

  const callbacks = useMemo<StageNodeCallbacks>(
    () => ({ onShowOutput, onEdit: handleEditNode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onShowOutput],
  );

  return (
    <StageNodeContext.Provider value={callbacks}>
      <NodeToolbarPositionProvider value={nodeToolbarPosition}>
        <div className="flex h-full min-h-0">
          <div className="relative min-w-0 flex-1">
            <ReactFlow
              nodes={decoratedNodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={handleConnect}
              onNodeClick={(_, node) => handleNodeClick(node as Node<StageNodeData>)}
              onNodeDoubleClick={(_, node) => handleNodeDoubleClick(node as Node<StageNodeData>)}
              onNodeDragStop={() => emit(nodesRef.current, edgesRef.current)}
              onPaneClick={handlePaneClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: "gradient" }}
              connectionMode={ConnectionMode.Loose}
              onInit={(instance) =>
                requestAnimationFrame(() => instance.fitView({ padding: 0.1 }))
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
              {configDisplayMode === "popover" && editingNode && (
                <PopoverStageEditor
                  node={editingNode}
                  onUpdate={handleUpdateNode}
                  onDelete={handleDelete}
                  onCancel={() => setEditingNodeId(null)}
                  confirmBeforeDelete={confirmBeforeDelete}
                />
              )}
            </ReactFlow>
          </div>

          {configDisplayMode === "panel" && (
            <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white">
              <StageConfigUI
                node={editingNode}
                onUpdate={(id, patch) => {
                  handleUpdateNode(id, patch);
                  setEditingNodeId(null);
                }}
                onDelete={handleDelete}
                onCancel={() => setEditingNodeId(null)}
                confirmBeforeDelete={confirmBeforeDelete}
              />
            </div>
          )}
        </div>
      </NodeToolbarPositionProvider>
    </StageNodeContext.Provider>
  );
});
