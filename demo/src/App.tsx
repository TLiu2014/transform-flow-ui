import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import {
  DataSchemaView,
  JsonView,
  PipelineIOPanel,
  TransformationFlow,
  type DatasetSchema,
  type PipelineSchema,
  type SerializedStage,
  type TransformationFlowHandle,
} from "transform-flow-ui";

import {
  SettingsMenu,
  type AppSettings,
} from "./SettingsMenu";
import {
  INITIAL_PIPELINE_NAME,
  INITIAL_SCHEMA,
  SAMPLE_DATASET_SCHEMAS,
  SAMPLE_PIPELINES,
} from "./SampleData";

type BottomTab = "schema" | "json";

export default function App() {
  // Canvas schema — updated by TransformationFlow via onChange.
  const [canvasSchema, setCanvasSchema] = useState<PipelineSchema>(INITIAL_SCHEMA);
  // Pipeline name is kept separate so the name input doesn't reload the canvas.
  const [pipelineName, setPipelineName] = useState(INITIAL_PIPELINE_NAME);

  const [appSettings, setAppSettings] = useState<AppSettings>({
    configDisplayMode: "popover",
    bottomPanelLayout: "split",
    confirmBeforeDelete: true,
  });
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(
    INITIAL_SCHEMA.stages[0]?.id ?? null,
  );
  const [bottomTab, setBottomTab] = useState<BottomTab>("schema");
  // Ref to the canvas — used to imperatively add stages from the toolbar.
  const flowRef = useRef<TransformationFlowHandle>(null);

  // Schema shown to viewers merges the live canvas schema with the current
  // pipeline name and any known dataset column info.
  const viewSchema = useMemo(
    () => ({
      ...canvasSchema,
      pipeline: { ...canvasSchema.pipeline, name: pipelineName },
      datasets: {
        ...canvasSchema.datasets,
        ...datasetsFromSamples(canvasSchema.stages),
      },
    }),
    [canvasSchema, pipelineName],
  );

  const handleLoadPipeline = useCallback((schema: PipelineSchema) => {
    setCanvasSchema(schema);
    setPipelineName(schema.pipeline.name);
    setActiveSchemaId(schema.stages[0]?.id ?? null);
  }, []);

  const patchAppSettings = useCallback((patch: Partial<AppSettings>) => {
    setAppSettings((s) => ({ ...s, ...patch }));
  }, []);

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
                <TransformationFlow
                  ref={flowRef}
                  schema={canvasSchema}
                  onChange={setCanvasSchema}
                  onShowOutput={(stageId) => {
                    setActiveSchemaId(stageId);
                    setBottomTab("schema");
                  }}
                  configDisplayMode={appSettings.configDisplayMode}
                  confirmBeforeDelete={appSettings.confirmBeforeDelete}
                />
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
                          schema={viewSchema}
                          activeStageId={activeSchemaId}
                          onActiveStageIdChange={setActiveSchemaId}
                        />
                      ) : (
                        <JsonView schema={viewSchema} />
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
                          schema={viewSchema}
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
                          <JsonView schema={viewSchema} />
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

function ResizeHandle({
  orientation,
}: {
  orientation: "vertical" | "horizontal";
}) {
  const base =
    "relative bg-gray-200 transition-colors data-[resize-handle-state=hover]:bg-blue-400 data-[resize-handle-state=drag]:bg-blue-500";
  const cls =
    orientation === "vertical"
      ? `${base} w-px hover:w-1`
      : `${base} h-px hover:h-1`;
  return <Separator className={cls} />;
}

function SplitPanelLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-8 shrink-0 items-center border-b border-gray-200 bg-gray-50 px-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
      {children}
    </div>
  );
}

function BottomTabs({
  active,
  onChange,
}: {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
}) {
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
