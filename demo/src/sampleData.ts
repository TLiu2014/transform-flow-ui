import {
  type AIPipelineSchema,
  type DatasetSchema,
  type PipelineSchema,
  type SamplePipelineEntry,
} from "transform-flow-ui";

import manifest from "../samples/index.json";

interface ManifestEntry {
  id: string;
  label: string;
  description: string;
}

// Vite glob-imports every sample file in the folder, eagerly inlined at build
// time. The convention is `<id>.ui.json` for the canvas/full PipelineSchema
// and `<id>.ai.json` for the schema-only AI payload (no `layout`, no
// `createdAt`, no UI cosmetic fields).
const uiModules = import.meta.glob<{ default: PipelineSchema }>(
  "../samples/*.ui.json",
  { eager: true },
);
const aiModules = import.meta.glob<{ default: AIPipelineSchema }>(
  "../samples/*.ai.json",
  { eager: true },
);

function findByBasename<T>(
  modules: Record<string, { default: T }>,
  basename: string,
): T {
  for (const [path, mod] of Object.entries(modules)) {
    if (path.endsWith(`/${basename}`)) return mod.default;
  }
  throw new Error(`Sample file not found: ${basename}`);
}

export interface SampleBundle {
  id: string;
  label: string;
  description: string;
  schema: PipelineSchema;
  aiSchema: AIPipelineSchema;
}

const SAMPLES: ManifestEntry[] = manifest as ManifestEntry[];

export const SAMPLE_BUNDLES: SampleBundle[] = SAMPLES.map((m) => ({
  id: m.id,
  label: m.label,
  description: m.description,
  schema: findByBasename(uiModules, `${m.id}.ui.json`),
  aiSchema: findByBasename(aiModules, `${m.id}.ai.json`),
}));

export type { SamplePipelineEntry };

export const SAMPLE_PIPELINES: SamplePipelineEntry[] = SAMPLE_BUNDLES.map(
  ({ id, label, description, schema }) => ({ id, label, description, schema }),
);

const DEFAULT_SAMPLE = SAMPLE_BUNDLES[0]!;

export const INITIAL_SCHEMA = DEFAULT_SAMPLE.schema;
export const INITIAL_PIPELINE_NAME = DEFAULT_SAMPLE.schema.pipeline.name;

export const SAMPLE_DATASET_SCHEMAS: Record<string, DatasetSchema> =
  Object.fromEntries(
    SAMPLE_BUNDLES.flatMap((s) => Object.entries(s.schema.datasets)),
  );
