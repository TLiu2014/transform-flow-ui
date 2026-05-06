// Components
export { TransformationFlow } from "./components/flow/TransformationFlow";
export { StageNode } from "./components/flow/StageNode";
export { StageConfigUI } from "./components/config/StageConfigUI";
export { ResultsTabView } from "./components/results/ResultsTabView";
export { DataTable } from "./components/results/DataTable";
export { SaveFlowButton } from "./components/toolbar/SaveFlowButton";
export { AddStageMenu } from "./components/toolbar/AddStageMenu";

// Types
export type {
  StageType,
  StageConfig,
  StageNodeData,
  FilterOperator,
  JoinType,
  SortDirection,
  AggregateFn,
  LoadConfig,
  FilterConfig,
  JoinConfig,
  UnionConfig,
  GroupConfig,
  GroupAggregation,
  SortConfig,
  SortOrder,
  SelectConfig,
  CustomConfig,
  ExecutionState,
} from "./types/pipeline";

export { STAGE_COLORS, STAGE_LABELS, defaultConfigFor } from "./types/pipeline";

// Schema
export type {
  PipelineSchema,
  SerializedStage,
  DatasetSchema,
  ColumnType,
  PipelineLayout,
  SerializeOptions,
  DeserializedPipeline,
} from "./schema";

export { serializePipeline, deserializePipeline } from "./schema";

// Mocks (for demos / quickstart)
export type { MockTable } from "./mocks/tables";
export {
  MOCK_TABLES,
  getMockResultFor,
  mockCustomers,
  mockOrders,
  mockFilteredCustomers,
  mockJoined,
} from "./mocks/tables";
export {
  SAMPLE_NODES,
  SAMPLE_EDGES,
  SAMPLE_PIPELINE_NAME,
} from "./mocks/pipeline";

export type { SaveFlowButtonProps } from "./components/toolbar/SaveFlowButton";
