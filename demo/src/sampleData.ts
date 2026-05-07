import {
  deserializePipeline,
  type DatasetSchema,
  type PipelineSchema,
  type SamplePipelineEntry,
} from "transform-flow-ui";

import revenueByCountryJson from "../samples/pipelines/revenue-by-country.json";
import revenueAndStatusJson from "../samples/pipelines/revenue-and-status.json";
import customersSchema from "../samples/schemas/customers.json";
import ordersSchema from "../samples/schemas/orders.json";

interface SampleSchemaFile {
  name: string;
  columns: DatasetSchema["columns"];
}

export type { SamplePipelineEntry };

const REVENUE_BY_COUNTRY = revenueByCountryJson as PipelineSchema;
const REVENUE_AND_STATUS = revenueAndStatusJson as PipelineSchema;

export const SAMPLE_PIPELINES: SamplePipelineEntry[] = [
  {
    id: "revenue-by-country",
    label: "Revenue by country",
    description: "Linear: load × 2 → join → filter → group",
    schema: REVENUE_BY_COUNTRY,
    pipeline: deserializePipeline(REVENUE_BY_COUNTRY),
  },
  {
    id: "revenue-and-status",
    label: "Revenue + status",
    description: "Branched: same join, two parallel groupings",
    schema: REVENUE_AND_STATUS,
    pipeline: deserializePipeline(REVENUE_AND_STATUS),
  },
];

const DEFAULT_SAMPLE = SAMPLE_PIPELINES[0]!;

export const INITIAL_PIPELINE_NAME = DEFAULT_SAMPLE.pipeline.name;
export const INITIAL_SAMPLE_NODES = DEFAULT_SAMPLE.pipeline.nodes;
export const INITIAL_SAMPLE_EDGES = DEFAULT_SAMPLE.pipeline.edges;

const SAMPLE_SCHEMA_FILES: SampleSchemaFile[] = [
  customersSchema as SampleSchemaFile,
  ordersSchema as SampleSchemaFile,
];

/**
 * Source dataset schemas keyed by table name. Both sample pipelines reference
 * `customers` and `orders` from this map via their LOAD stages.
 */
export const SAMPLE_DATASET_SCHEMAS: Record<string, DatasetSchema> =
  Object.fromEntries(
    SAMPLE_SCHEMA_FILES.map((s) => [s.name, { columns: s.columns }]),
  );
