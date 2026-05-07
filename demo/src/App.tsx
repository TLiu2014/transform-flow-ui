import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  NodeToolbar,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { Group, Panel, Separator } from "react-resizable-panels";

import {
  DataSchemaView,
  FlowCanvasToolbar,
  JsonView,
  PipelineIOPanel,
  StageConfigUI,
  TransformationFlow,
  useNodeToolbarPosition,
  defaultConfigFor,
  serializePipeline,
  STAGE_LABELS,
  type DatasetSchema,
  type DeserializedPipeline,
  type SerializedStage,
  type StageNodeData,
  type StageType,
} from "transform-flow-ui";

import {
  SettingsMenu,
  type AppSettings,
} from "./SettingsMenu";
import {
  INITIAL_PIPELINE_NAME,
  INITIAL_SAMPLE_EDGES,
  INITIAL_SAMPLE_NODES,
  SAMPLE_DATASET_SCHEMAS,
  SAMPLE_PIPELINES,
} from "./sampleData";

type BottomTab = "schema" | "json";

export default function App() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<StageNodeData>>(INITIAL_SAMPLE_NODES);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<Edge>(INITIAL_SAMPLE_EDGES);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null,
  );
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState(INITIAL_PIPELINE_NAME);
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(
    INITIAL_SAMPLE_NODES[0]?.id ?? null,
  );
  const [appSettings, setAppSettings] = useState<AppSettings>({
    configDisplayMode: "popover",
    bottomPanelLayout: "split",
    confirmBeforeDelete: true,
  });
  const [bottomTab, setBottomTab] = useState<BottomTab>("schema");
  const [refreshTick, setRefreshTick] = useState(0);
  const [flowToolbarExpanded, setFlowToolbarExpanded] = useState(true);
  const [editPanelPosition, setEditPanelPosition] = useState(Position.Right);

  const editingNode = useMemo(
    () => nodes.find((n) => n.id === editingNodeId) ?? null,
    [nodes, editingNodeId],
  );

  const liveSchema = useMemo(() => {
    const schema = serializePipeline(nodes, edges, { name: pipelineName });
    return {
      ...schema,
      datasets: {
        ...schema.datasets,
        ...datasetsFromSamples(schema.stages),
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, pipelineName, refreshTick]);

  // Keep activeSchemaId valid when stages are added/removed.
  useEffect(() => {
    if (activeSchemaId && nodes.some((n) => n.id === activeSchemaId)) return;
    setActiveSchemaId(nodes[0]?.id ?? null);
  }, [nodes, activeSchemaId]);

  // Drop the editing node if it gets removed from the canvas.
  useEffect(() => {
    if (editingNodeId && !nodes.some((n) => n.id === editingNodeId)) {
      setEditingNodeId(null);
    }
  }, [nodes, editingNodeId]);

  const handleConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const handleAddStage = useCallback(
    (stageType: StageType) => {
      const id = `n${Date.now().toString(36)}`;
      const stageIndex = nodes.length + 1;
      const newNode: Node<StageNodeData> = {
        id,
        type: "stageNode",
        position: { x: 80 + (stageIndex % 3) * 60, y: 80 + stageIndex * 80 },
        data: {
          stageType,
          label: `${STAGE_LABELS[stageType]} #${stageIndex}`,
          stageIndex,
          config: defaultConfigFor(stageType),
          outputTableName: `${stageType.toLowerCase()}_${stageIndex}`,
        },
      };
      setNodes((ns) => [...ns, newNode]);
      setHighlightedNodeId(id);
      setEditingNodeId(id);
    },
    [nodes.length, setNodes],
  );

  const handleUpdateNode = useCallback(
    (id: string, patch: Partial<StageNodeData>) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
        ),
      );
    },
    [setNodes],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((ns) => ns.filter((n) => n.id !== id));
      setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
      setEditingNodeId((curr) => (curr === id ? null : curr));
      setHighlightedNodeId((curr) => (curr === id ? null : curr));
    },
    [setNodes, setEdges],
  );

  const handleLoadPipeline = useCallback(
    (pipeline: DeserializedPipeline) => {
      setNodes(pipeline.nodes);
      setEdges(pipeline.edges);
      setPipelineName(pipeline.name);
      setHighlightedNodeId(null);
      setEditingNodeId(null);
      setActiveSchemaId(pipeline.nodes[0]?.id ?? null);
    },
    [setNodes, setEdges],
  );

  const handleNodeClick = useCallback(
    (node: Node<StageNodeData>) => {
      setHighlightedNodeId(node.id);
      // In panel mode the right-side form is always visible — single click
      // updates which node it shows. In popover mode we keep the popover
      // closed; the user opens it explicitly via double-click or the pencil.
      if (appSettings.configDisplayMode === "panel") {
        setEditingNodeId(node.id);
      }
    },
    [appSettings.configDisplayMode],
  );

  const handleNodeDoubleClick = useCallback((node: Node<StageNodeData>) => {
    setHighlightedNodeId(node.id);
    setEditingNodeId(node.id);
  }, []);

  const handleEditFromNode = useCallback((stageId: string) => {
    setHighlightedNodeId(stageId);
    setEditingNodeId(stageId);
  }, []);

  const handlePaneClick = useCallback(() => {
    setHighlightedNodeId(null);
    // In popover mode the canvas (pane) is large and easy to click by
    // mistake; closing here would silently drop unsaved edits, so we keep
    // the popover open until the user explicitly clicks Save or Cancel.
    if (appSettings.configDisplayMode !== "popover") {
      setEditingNodeId(null);
    }
  }, [appSettings.configDisplayMode]);

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const patchAppSettings = useCallback((patch: Partial<AppSettings>) => {
    setAppSettings((s) => ({ ...s, ...patch }));
  }, []);

  const showPopoverConfig =
    appSettings.configDisplayMode === "popover" && editingNode !== null;

  const ringNodeId = editingNodeId ?? highlightedNodeId;

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-purple-500" />
          <h1 className="text-base font-semibold text-gray-900">
            transform-flow-ui
          </h1>
          <span className="hidden text-xs text-gray-500 md:inline">
            · pure-UI pipeline builder
          </span>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <input
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            className="h-8 w-56 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="pipeline name"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SettingsMenu settings={appSettings} onChange={patchAppSettings} />
        </div>
      </header>

      <Group orientation="horizontal" className="min-h-0 min-w-0 flex-1">
        <Panel
          defaultSize={360}
          minSize={180}
          maxSize="32"
          className="min-h-0"
        >
          <aside className="flex h-full min-h-0 w-full flex-col overflow-y-auto border-r border-gray-200 bg-white">
            <PipelineIOPanel
              onLoad={handleLoadPipeline}
              samples={SAMPLE_PIPELINES}
            />
          </aside>
        </Panel>

        <ResizeHandle orientation="vertical" />

        <Panel minSize="30" className="min-w-0 !overflow-visible">
          <Group
            orientation="vertical"
            className="h-full"
            id="tfu-main-vertical"
          >
            <Panel defaultSize="60" minSize="25">
              <section className="relative h-full bg-white">
                {appSettings.configDisplayMode === "panel" ? (
                  <Group
                    orientation="horizontal"
                    className="h-full"
                    id="tfu-canvas-edit"
                  >
                    <Panel minSize="30" className="!overflow-visible">
                      <CanvasContent
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={handleConnect}
                        onNodeClick={handleNodeClick}
                        onNodeDoubleClick={handleNodeDoubleClick}
                        onPaneClick={handlePaneClick}
                        ringNodeId={ringNodeId}
                        editPanelPosition={editPanelPosition}
                        flowToolbarExpanded={flowToolbarExpanded}
                        setFlowToolbarExpanded={setFlowToolbarExpanded}
                        setEditPanelPosition={setEditPanelPosition}
                        handleAddStage={handleAddStage}
                        setActiveSchemaId={setActiveSchemaId}
                        setBottomTab={setBottomTab}
                        handleEditFromNode={handleEditFromNode}
                        showPopoverConfig={showPopoverConfig}
                        editingNode={editingNode}
                        handleUpdateNode={handleUpdateNode}
                        handleDeleteNode={handleDeleteNode}
                        handleCancelEdit={handleCancelEdit}
                        confirmBeforeDelete={appSettings.confirmBeforeDelete}
                      />
                    </Panel>

                    <ResizeHandle orientation="vertical" />

                    <Panel
                      defaultSize="22"
                      minSize="15"
                      maxSize="45"
                    >
                      <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
                        <StageConfigUI
                          node={editingNode}
                          onUpdate={handleUpdateNode}
                          onDelete={handleDeleteNode}
                          onCancel={handleCancelEdit}
                          confirmBeforeDelete={appSettings.confirmBeforeDelete}
                        />
                      </aside>
                    </Panel>
                  </Group>
                ) : (
                  <CanvasContent
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={handleConnect}
                    onNodeClick={handleNodeClick}
                    onNodeDoubleClick={handleNodeDoubleClick}
                    onPaneClick={handlePaneClick}
                    ringNodeId={ringNodeId}
                    editPanelPosition={editPanelPosition}
                    flowToolbarExpanded={flowToolbarExpanded}
                    setFlowToolbarExpanded={setFlowToolbarExpanded}
                    setEditPanelPosition={setEditPanelPosition}
                    handleAddStage={handleAddStage}
                    setActiveSchemaId={setActiveSchemaId}
                    setBottomTab={setBottomTab}
                    handleEditFromNode={handleEditFromNode}
                    showPopoverConfig={showPopoverConfig}
                    editingNode={editingNode}
                    handleUpdateNode={handleUpdateNode}
                    handleDeleteNode={handleDeleteNode}
                    handleCancelEdit={handleCancelEdit}
                    confirmBeforeDelete={appSettings.confirmBeforeDelete}
                  />
                )}
              </section>
            </Panel>

            <ResizeHandle orientation="horizontal" />

            <Panel defaultSize="40" minSize="15">
              <section className="flex h-full flex-col bg-white">
                {appSettings.bottomPanelLayout === "tabs" ? (
                  <>
                    <BottomTabs active={bottomTab} onChange={setBottomTab} />
                    <div className="min-h-0 flex-1 overflow-hidden">
                      {bottomTab === "schema" ? (
                        <DataSchemaView
                          schema={liveSchema}
                          activeStageId={activeSchemaId}
                          onActiveStageIdChange={setActiveSchemaId}
                        />
                      ) : (
                        <JsonView
                          schema={liveSchema}
                          refreshTick={refreshTick}
                          onRefresh={() => setRefreshTick((t) => t + 1)}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <Group
                    orientation="horizontal"
                    className="min-h-0 flex-1"
                    id="tfu-bottom-split"
                  >
                    <Panel defaultSize="50" minSize="20">
                      <div className="flex h-full min-w-0 flex-col overflow-hidden">
                        <SplitPanelLabel>Data schema</SplitPanelLabel>
                        <div className="min-h-0 flex-1 overflow-hidden">
                          <DataSchemaView
                            schema={liveSchema}
                            activeStageId={activeSchemaId}
                            onActiveStageIdChange={setActiveSchemaId}
                          />
                        </div>
                      </div>
                    </Panel>

                    <ResizeHandle orientation="vertical" />

                    <Panel defaultSize="50" minSize="20">
                      <div className="flex h-full min-w-0 flex-col overflow-hidden">
                        <SplitPanelLabel>Pipeline JSON</SplitPanelLabel>
                        <div className="min-h-0 flex-1 overflow-hidden">
                          <JsonView
                            schema={liveSchema}
                            refreshTick={refreshTick}
                            onRefresh={() => setRefreshTick((t) => t + 1)}
                          />
                        </div>
                      </div>
                    </Panel>
                  </Group>
                )}
              </section>
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}

interface CanvasContentProps {
  nodes: Node<StageNodeData>[];
  edges: Edge[];
  onNodesChange: Parameters<typeof TransformationFlow>[0]["onNodesChange"];
  onEdgesChange: Parameters<typeof TransformationFlow>[0]["onEdgesChange"];
  onConnect: (c: Connection) => void;
  onNodeClick: (node: Node<StageNodeData>) => void;
  onNodeDoubleClick: (node: Node<StageNodeData>) => void;
  onPaneClick: () => void;
  ringNodeId: string | null;
  editPanelPosition: Position;
  flowToolbarExpanded: boolean;
  setFlowToolbarExpanded: (v: boolean) => void;
  setEditPanelPosition: (p: Position) => void;
  handleAddStage: (stageType: StageType) => void;
  setActiveSchemaId: (id: string | null) => void;
  setBottomTab: (tab: BottomTab) => void;
  handleEditFromNode: (stageId: string) => void;
  showPopoverConfig: boolean;
  editingNode: Node<StageNodeData> | null;
  handleUpdateNode: (id: string, patch: Partial<StageNodeData>) => void;
  handleDeleteNode: (id: string) => void;
  handleCancelEdit: () => void;
  confirmBeforeDelete: boolean;
}

function CanvasContent({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  ringNodeId,
  editPanelPosition,
  flowToolbarExpanded,
  setFlowToolbarExpanded,
  setEditPanelPosition,
  handleAddStage,
  setActiveSchemaId,
  setBottomTab,
  handleEditFromNode,
  showPopoverConfig,
  editingNode,
  handleUpdateNode,
  handleDeleteNode,
  handleCancelEdit,
  confirmBeforeDelete,
}: CanvasContentProps) {
  return (
    <div className="relative h-full min-w-0">
      <FlowCanvasToolbar
        expanded={flowToolbarExpanded}
        onExpandedChange={setFlowToolbarExpanded}
        editPanelPosition={editPanelPosition}
        onEditPanelPositionChange={setEditPanelPosition}
        onAddStage={handleAddStage}
      />
      <TransformationFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        selectedNodeId={ringNodeId}
        nodeToolbarPosition={editPanelPosition}
        onShowOutput={(stageId) => {
          setActiveSchemaId(stageId);
          setBottomTab("schema");
        }}
        onEditNode={handleEditFromNode}
      >
        {showPopoverConfig && editingNode ? (
          <PopoverStageEditor
            editingNode={editingNode}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
            onCancel={handleCancelEdit}
            confirmBeforeDelete={confirmBeforeDelete}
          />
        ) : null}
      </TransformationFlow>
    </div>
  );
}

interface ResizeHandleProps {
  /**
   * "vertical" = a vertical bar between two horizontally-laid-out panels.
   * "horizontal" = a horizontal bar between two vertically-laid-out panels.
   */
  orientation: "vertical" | "horizontal";
}

function ResizeHandle({ orientation }: ResizeHandleProps) {
  const base =
    "relative bg-gray-200 transition-colors data-[resize-handle-state=hover]:bg-blue-400 data-[resize-handle-state=drag]:bg-blue-500";
  const cls =
    orientation === "vertical"
      ? `${base} w-px hover:w-1`
      : `${base} h-px hover:h-1`;
  return <Separator className={cls} />;
}

interface BottomTabsProps {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
}

function SplitPanelLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-8 shrink-0 items-center border-b border-gray-200 bg-gray-50 px-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
      {children}
    </div>
  );
}

function BottomTabs({ active, onChange }: BottomTabsProps) {
  const tabs: Array<{ id: BottomTab; label: string }> = [
    { id: "schema", label: "Data schema" },
    { id: "json", label: "Pipeline JSON" },
  ];
  return (
    <div className="flex h-9 items-center gap-1 border-b border-gray-200 bg-white px-2">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={
              "inline-flex items-center whitespace-nowrap border-b-2 px-3 py-1.5 text-sm font-medium transition-colors " +
              (isActive
                ? "border-blue-500 text-gray-900"
                : "border-transparent text-gray-600 hover:text-gray-900")
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Approximate popover footprint — used to pan the canvas so the node + popover
// both fit on screen when the editor opens. Width is fixed; height is only an
// estimate because the editor now grows with its content up to the viewport cap.
const POPOVER_W = 340;
const POPOVER_H = 520;
const POPOVER_OFFSET = 16;
const NODE_FALLBACK_W = 220;
const NODE_FALLBACK_H = 110;
const FOCUS_DURATION_MS = 300;

function PopoverStageEditor({
  editingNode,
  onUpdate,
  onDelete,
  onCancel,
  confirmBeforeDelete,
}: {
  editingNode: Node<StageNodeData>;
  onUpdate: (id: string, patch: Partial<StageNodeData>) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
  confirmBeforeDelete: boolean;
}) {
  const position = useNodeToolbarPosition();
  const reactFlow = useReactFlow();
  const nodeId = editingNode.id;

  // When the popover opens (or switches nodes / sides), pan the canvas so the
  // node + popover are both centered. Zoom is preserved.
  useEffect(() => {
    const internal = reactFlow.getInternalNode(nodeId);
    if (!internal) return;

    const w = internal.measured?.width ?? NODE_FALLBACK_W;
    const h = internal.measured?.height ?? NODE_FALLBACK_H;
    const nodeX = internal.internals.positionAbsolute.x;
    const nodeY = internal.internals.positionAbsolute.y;

    let cx = nodeX + w / 2;
    let cy = nodeY + h / 2;

    switch (position) {
      case Position.Right:
        cx += (POPOVER_W + POPOVER_OFFSET) / 2;
        break;
      case Position.Left:
        cx -= (POPOVER_W + POPOVER_OFFSET) / 2;
        break;
      case Position.Top:
        cy -= (POPOVER_H + POPOVER_OFFSET) / 2;
        break;
      case Position.Bottom:
        cy += (POPOVER_H + POPOVER_OFFSET) / 2;
        break;
    }

    const { zoom } = reactFlow.getViewport();
    reactFlow.setCenter(cx, cy, { zoom, duration: FOCUS_DURATION_MS });
  }, [nodeId, position, reactFlow]);

  return (
    <NodeToolbar
      nodeId={nodeId}
      isVisible
      position={position}
      offset={POPOVER_OFFSET}
      className="!pointer-events-auto !flex !flex-col [&>*]:min-h-0"
    >
      <div
        className="box-border flex min-h-0 w-[340px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
        style={{
          maxHeight: "85vh",
        }}
      >
        <StageConfigUI
          node={editingNode}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCancel={onCancel}
          confirmBeforeDelete={confirmBeforeDelete}
        />
      </div>
    </NodeToolbar>
  );
}

function datasetsFromSamples(
  stages: SerializedStage[],
): Record<string, DatasetSchema> {
  const datasets: Record<string, DatasetSchema> = {};
  for (const stage of stages) {
    if (stage.type !== "LOAD" || stage.operation.stageType !== "LOAD") continue;
    const tableName = stage.operation.tableName || stage.output;
    const sample = SAMPLE_DATASET_SCHEMAS[tableName];
    if (sample) datasets[tableName] = sample;
  }
  return datasets;
}
