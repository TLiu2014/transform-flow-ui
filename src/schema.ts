import type { Edge, Node } from "@xyflow/react";
import type {
  StageConfig,
  StageNodeData,
  StageType,
} from "@/types/pipeline";
import { MOCK_TABLES } from "@/mocks/tables";

/**
 * Pipeline schema designed for data engineers.
 *
 *   `pipeline`  — top-level metadata
 *   `datasets`  — input data schemas (column names + inferred types)
 *   `stages`    — ordered DAG of transformations: each stage declares its
 *                 inputs, output table, dependencies, and operation params
 *   `layout`    — secondary, UI-only: node positions + edges to round-trip
 *                 the canvas. Safe to drop if you only care about the data.
 */
export interface PipelineSchema {
  version: "1.0";
  pipeline: {
    name: string;
    createdAt: string;
    description?: string;
  };
  datasets: Record<string, DatasetSchema>;
  stages: SerializedStage[];
  layout: PipelineLayout;
}

export interface DatasetSchema {
  columns: Array<{ name: string; type: ColumnType }>;
}

export type ColumnType =
  | "integer"
  | "float"
  | "string"
  | "boolean"
  | "date"
  | "timestamp"
  | "unknown";

export interface SerializedStage {
  id: string;
  name: string;
  type: StageType;
  depends_on: string[];
  inputs: string[];
  output: string;
  operation: StageConfig;
}

export interface PipelineLayout {
  nodes: Array<{ id: string; position: { x: number; y: number } }>;
  edges: Array<{ id: string; source: string; target: string }>;
}

export interface SerializeOptions {
  name: string;
  description?: string;
}

/**
 * Serialize a React Flow graph into the data-engineer-readable PipelineSchema.
 * `inputs` for each stage are derived from `operation` (FILTER.table, JOIN.left/rightTable,
 * etc.) so the JSON makes sense without inspecting the canvas.
 */
export function serializePipeline(
  nodes: Node<StageNodeData>[],
  edges: Edge[],
  options: SerializeOptions,
): PipelineSchema {
  const stages = orderNodesTopologically(nodes, edges).map((node) =>
    toSerializedStage(node, edges),
  );

  return {
    version: "1.0",
    pipeline: {
      name: options.name,
      createdAt: new Date().toISOString(),
      ...(options.description ? { description: options.description } : {}),
    },
    datasets: collectDatasets(stages),
    stages,
    layout: {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    },
  };
}

function toSerializedStage(
  node: Node<StageNodeData>,
  edges: Edge[],
): SerializedStage {
  const dependsOn = edges
    .filter((e) => e.target === node.id)
    .map((e) => e.source);

  const inputs = collectStageInputs(node.data.config);
  const fallbackOutput = `${node.data.stageType.toLowerCase()}_${node.data.stageIndex}`;

  return {
    id: node.id,
    name: slugify(node.data.label) || fallbackOutput,
    type: node.data.stageType,
    depends_on: dependsOn,
    inputs,
    output: node.data.outputTableName ?? fallbackOutput,
    operation: node.data.config,
  };
}

function collectStageInputs(config: StageConfig): string[] {
  switch (config.stageType) {
    case "LOAD":
      return [];
    case "FILTER":
    case "GROUP":
    case "SORT":
    case "SELECT":
      return config.table ? [config.table] : [];
    case "JOIN":
      return [config.leftTable, config.rightTable].filter(Boolean) as string[];
    case "UNION":
      return [...config.tables];
    case "CUSTOM":
      return [];
  }
}

function collectDatasets(
  stages: SerializedStage[],
): Record<string, DatasetSchema> {
  const datasets: Record<string, DatasetSchema> = {};
  for (const stage of stages) {
    if (stage.type !== "LOAD") continue;
    const op = stage.operation;
    if (op.stageType !== "LOAD") continue;
    const tableName = op.tableName || stage.output;
    datasets[tableName] = inferDatasetSchema(tableName);
  }
  return datasets;
}

function inferDatasetSchema(tableName: string): DatasetSchema {
  const mock = MOCK_TABLES[tableName];
  if (!mock) return { columns: [] };
  const sample = mock.rows[0] ?? {};
  return {
    columns: mock.columns.map((name) => ({
      name,
      type: inferColumnType(sample[name]),
    })),
  };
}

function inferColumnType(v: unknown): ColumnType {
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "float";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return "date";
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return "timestamp";
    return "string";
  }
  return "unknown";
}

function orderNodesTopologically(
  nodes: Node<StageNodeData>[],
  edges: Edge[],
): Node<StageNodeData>[] {
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const edge of edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) continue;
    adj.get(edge.source)!.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of indegree) if (deg === 0) queue.push(id);
  queue.sort((a, b) => indexOrZero(nodes, a) - indexOrZero(nodes, b));

  const ordered: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    ordered.push(id);
    for (const next of adj.get(id) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  // Cycle fallback: append any remaining nodes in original order.
  if (ordered.length < nodes.length) {
    const seen = new Set(ordered);
    for (const n of nodes) if (!seen.has(n.id)) ordered.push(n.id);
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  return ordered.map((id) => byId.get(id)!).filter(Boolean);
}

function indexOrZero(nodes: Node<StageNodeData>[], id: string): number {
  return nodes.findIndex((n) => n.id === id);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export interface DeserializedPipeline {
  name: string;
  nodes: Node<StageNodeData>[];
  edges: Edge[];
}

/** Inverse of serializePipeline (best-effort; `layout` carries positions). */
export function deserializePipeline(schema: PipelineSchema): DeserializedPipeline {
  const positions = new Map(
    schema.layout.nodes.map((n) => [n.id, n.position]),
  );
  const nodes: Node<StageNodeData>[] = schema.stages.map((stage, i) => ({
    id: stage.id,
    type: "stageNode",
    position: positions.get(stage.id) ?? { x: 80, y: 80 + i * 140 },
    data: {
      stageType: stage.type,
      label: stage.name,
      stageIndex: i + 1,
      outputTableName: stage.output,
      config: stage.operation,
    },
  }));

  return {
    name: schema.pipeline.name,
    nodes,
    edges: schema.layout.edges.map((e) => ({ ...e })),
  };
}
