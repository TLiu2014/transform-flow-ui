// Components
export { TransformationFlow } from "./components/flow/TransformationFlow";
export { useNodeToolbarPosition } from "./components/flow/node-toolbar-position-context";
export { StageNode } from "./components/flow/StageNode";
export { FlowCanvasToolbar } from "./components/flow/FlowCanvasToolbar";
export type { FlowCanvasToolbarProps } from "./components/flow/FlowCanvasToolbar";
export { StageConfigUI } from "./components/config/StageConfigUI";
export { ResultsTabView } from "./components/results/ResultsTabView";
export { DataTable } from "./components/results/DataTable";
export { SaveFlowButton } from "./components/toolbar/SaveFlowButton";
export { AddStageMenu } from "./components/toolbar/AddStageMenu";
export { DataSchemaView } from "./components/views/DataSchemaView";
export type { DataSchemaViewProps } from "./components/views/DataSchemaView";
export { JsonView } from "./components/views/JsonView";
export type { JsonViewProps } from "./components/views/JsonView";
export { PipelineIOPanel } from "./components/io/PipelineIOPanel";
export type {
  PipelineIOPanelProps,
  SamplePipelineEntry,
} from "./components/io/PipelineIOPanel";

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
  InferredColumn,
  StageOutputSchema,
  InferredSchemaMap,
} from "./schema";

export {
  serializePipeline,
  deserializePipeline,
  validatePipelineSchema,
  inferOutputSchemas,
} from "./schema";

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
