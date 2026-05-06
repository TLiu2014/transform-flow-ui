import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";

import {
  AddStageMenu,
  ResultsTabView,
  SaveFlowButton,
  StageConfigUI,
  TransformationFlow,
  defaultConfigFor,
  serializePipeline,
  STAGE_LABELS,
  SAMPLE_NODES,
  SAMPLE_EDGES,
  SAMPLE_PIPELINE_NAME,
  type PipelineSchema,
  type StageNodeData,
  type StageType,
} from "transform-flow-ui";

import { JsonPanel } from "./JsonPanel";

export default function App() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<StageNodeData>>(SAMPLE_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(SAMPLE_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState(SAMPLE_PIPELINE_NAME);
  const [bottomTab, setBottomTab] = useState<"results" | "schema">("results");
  const [toast, setToast] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const liveSchema = useMemo(
    () => serializePipeline(nodes, edges, { name: pipelineName }),
    [nodes, edges, pipelineName],
  );

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
      setSelectedNodeId(id);
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
      setSelectedNodeId((curr) => (curr === id ? null : curr));
    },
    [setNodes, setEdges],
  );

  const handleSave = useCallback((schema: PipelineSchema) => {
    // Backend-free demo: log the data-engineer-readable JSON.
    // eslint-disable-next-line no-console
    console.log("[transform-flow-ui] pipeline schema →", schema);
    setToast(
      `Logged "${schema.pipeline.name}" to console (${schema.stages.length} stages, ${Object.keys(schema.datasets).length} datasets)`,
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-purple-500" />
          <h1 className="text-base font-semibold text-gray-900">
            transform-flow-ui
          </h1>
          <span className="hidden text-xs text-gray-500 md:inline">
            · pure-UI pipeline builder demo
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
          <button
            type="button"
            onClick={() =>
              setBottomTab((t) => (t === "results" ? "schema" : "results"))
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {bottomTab === "results" ? "View schema JSON" : "View results"}
          </button>
          <AddStageMenu onAdd={handleAddStage} />
          <SaveFlowButton
            name={pipelineName}
            nodes={nodes}
            edges={edges}
            onSave={handleSave}
            label="Save → console"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <section className="min-h-0 flex-1 border-b border-gray-200 bg-white">
            <TransformationFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeClick={(n) => setSelectedNodeId(n.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              selectedNodeId={selectedNodeId}
            />
          </section>
          <section className="h-[40%] min-h-[200px] bg-white">
            {bottomTab === "results" ? (
              <ResultsTabView nodes={nodes} />
            ) : (
              <JsonPanel data={liveSchema} />
            )}
          </section>
        </main>

        <aside className="w-[340px] shrink-0 border-l border-gray-200 bg-white">
          <StageConfigUI
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
          />
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
