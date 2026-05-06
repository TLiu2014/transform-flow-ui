import type { Edge, Node } from "@xyflow/react";
import type { StageNodeData } from "@/types/pipeline";

export const SAMPLE_NODES: Node<StageNodeData>[] = [
  {
    id: "n1",
    type: "stageNode",
    position: { x: 80, y: 80 },
    data: {
      stageType: "LOAD",
      label: "Load customers",
      stageIndex: 1,
      outputTableName: "customers",
      config: { stageType: "LOAD", tableName: "customers", source: "customers.csv" },
    },
  },
  {
    id: "n2",
    type: "stageNode",
    position: { x: 80, y: 240 },
    data: {
      stageType: "FILTER",
      label: "Filter US customers",
      stageIndex: 2,
      outputTableName: "filtered_customers",
      config: {
        stageType: "FILTER",
        table: "customers",
        column: "country",
        operator: "=",
        value: "US",
      },
    },
  },
  {
    id: "n3",
    type: "stageNode",
    position: { x: 80, y: 400 },
    data: {
      stageType: "JOIN",
      label: "Join with orders",
      stageIndex: 3,
      outputTableName: "customers_with_orders",
      config: {
        stageType: "JOIN",
        joinType: "INNER",
        leftTable: "filtered_customers",
        rightTable: "orders",
        leftKey: "id",
        rightKey: "customer_id",
      },
    },
  },
];

export const SAMPLE_EDGES: Edge[] = [
  { id: "e1-2", source: "n1", target: "n2" },
  { id: "e2-3", source: "n2", target: "n3" },
];

export const SAMPLE_PIPELINE_NAME = "us-customer-orders";
