import {
  deserializePipeline,
  type DatasetSchema,
  type PipelineSchema,
  type SamplePipelineEntry,
} from "transform-flow-ui";

import samplesJson from "../samples/samples.json";

interface SampleJsonEntry {
  id: string;
  label: string;
  description: string;
  schema: PipelineSchema;
}

export type { SamplePipelineEntry };

export const SAMPLE_PIPELINES: SamplePipelineEntry[] = (
  samplesJson as SampleJsonEntry[]
).map((s) => ({
  id: s.id,
  label: s.label,
  description: s.description,
  schema: s.schema,
  pipeline: deserializePipeline(s.schema),
}));

const DEFAULT_SAMPLE = SAMPLE_PIPELINES[0]!;

export const INITIAL_PIPELINE_NAME = DEFAULT_SAMPLE.pipeline.name;
export const INITIAL_SAMPLE_NODES = DEFAULT_SAMPLE.pipeline.nodes;
export const INITIAL_SAMPLE_EDGES = DEFAULT_SAMPLE.pipeline.edges;

export const SAMPLE_DATASET_SCHEMAS: Record<string, DatasetSchema> =
  Object.fromEntries(
    SAMPLE_PIPELINES.flatMap((s) => Object.entries(s.schema.datasets)),
  );
