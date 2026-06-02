import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Moon, Sun } from "lucide-react";

import {
  DataSchemaView,
  JsonView,
  PipelineIOPanel,
  ResultsView,
  TransformationFlow,
  validatePipelineSchema,
  type DatasetSchema,
  type PipelineSchema,
  type SerializedStage,
  type StageResult,
  type TransformationFlowHandle,
} from "transform-flow-ui";

import {
  SettingsMenu,
  type AppSettings,
} from "./SettingsMenu";
import {
  INITIAL_SCHEMA,
  SAMPLE_DATASET_SCHEMAS,
  SAMPLE_PIPELINES,
} from "./SampleData";

type BottomTab = "schema" | "data" | "json";
type ThemeMode = "light" | "dark";

const THEME_KEY = "transform-flow-ui-demo:theme";

function readSavedTheme(): ThemeMode {
  if (typeof localStorage === "undefined") return "light";
  const v = localStorage.getItem(THEME_KEY);
  return v === "dark" ? "dark" : "light";
}

function applyThemeClass(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
}

// Demo has no SQL execution backend, so the results map stays empty. The
// ResultsView still renders its tab strip and "no rows yet" placeholders to
// demonstrate the lib feature. A host with an engine would populate this
// per-stage from its own query results.
const DEMO_RESULTS: Record<string, StageResult> = {};

const STORAGE_KEY = "transform-flow-ui-demo:canvas-schema";

function readSavedSchema(): PipelineSchema | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (validatePipelineSchema(parsed) != null) return null;
    return parsed as PipelineSchema;
  } catch {
    return null;
  }
}

export default function App() {
  // Canvas schema — updated by TransformationFlow via onChange. On mount we
  // try to restore the last autosaved schema from localStorage; if missing
  // or corrupt, fall back to the first sample.
  const [canvasSchema, setCanvasSchema] = useState<PipelineSchema>(
    () => readSavedSchema() ?? INITIAL_SCHEMA,
  );
  // Pipeline name is kept separate so the name input doesn't reload the canvas.
  const [pipelineName, setPipelineName] = useState(
    () => canvasSchema.pipeline.name,
  );

  const [appSettings, setAppSettings] = useState<AppSettings>({
    configDisplayMode: "popover",
    bottomPanelLayout: "split",
    mainLayout: "top-bottom",
    confirmBeforeDelete: true,
    richExecutionState: false,
  });
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(
    () => canvasSchema.stages[0]?.id ?? null,
  );
  const [bottomTab, setBottomTab] = useState<BottomTab>("schema");
  const [theme, setTheme] = useState<ThemeMode>(() => readSavedTheme());

  // Apply theme class on every change + initial mount; persist to storage.
  useEffect(() => {
    applyThemeClass(theme);
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // ignore storage errors
      }
    }
  }, [theme]);
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

  // Autosave the live canvas schema (with current name) to localStorage so
  // refreshing the demo restores your work. JSON is small; no debounce needed.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      const toSave: PipelineSchema = {
        ...canvasSchema,
        pipeline: { ...canvasSchema.pipeline, name: pipelineName },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Quota exceeded or storage disabled — silently skip.
    }
  }, [canvasSchema, pipelineName]);

  const patchAppSettings = useCallback((patch: Partial<AppSettings>) => {
    setAppSettings((s) => ({ ...s, ...patch }));
  }, []);

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-800">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-purple-500" />
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            transform-flow-ui
          </h1>
          <span className="hidden text-xs text-gray-500 dark:text-gray-400 md:inline">
            · pure-UI pipeline builder
          </span>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <input
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            className="h-8 w-56 rounded-md border border-gray-300 dark:border-gray-600 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="pipeline name"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme((m) => (m === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
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
          <aside className="flex h-full min-h-0 w-full flex-col overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <PipelineIOPanel
              onLoad={handleLoadPipeline}
              samples={SAMPLE_PIPELINES}
            />
          </aside>
        </Panel>

        <ResizeHandle orientation="vertical" />

        <Panel minSize="30" className="min-w-0 !overflow-visible">
          <Group
            orientation={
              appSettings.mainLayout === "left-right" ? "horizontal" : "vertical"
            }
            className="h-full"
            id={`tfu-main-${appSettings.mainLayout}`}
            key={appSettings.mainLayout}
          >
            <Panel defaultSize="60" minSize="25">
              <section className="relative h-full bg-white dark:bg-gray-900">
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
                  richExecutionState={appSettings.richExecutionState}
                />
              </section>
            </Panel>

            <ResizeHandle
              orientation={
                appSettings.mainLayout === "left-right" ? "vertical" : "horizontal"
              }
            />

            <Panel defaultSize="40" minSize="15">
              <section className="flex h-full flex-col bg-white dark:bg-gray-900">
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
                      ) : bottomTab === "data" ? (
                        <ResultsView
                          schema={viewSchema}
                          results={DEMO_RESULTS}
                          activeStageId={activeSchemaId}
                          onActiveStageIdChange={setActiveSchemaId}
                          emptyMessage="The demo has no execution backend, so rows are empty. Wire a host engine to populate ResultsView."
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
    "relative bg-gray-200 dark:bg-gray-700 transition-colors data-[resize-handle-state=hover]:bg-blue-400 data-[resize-handle-state=drag]:bg-blue-500";
  const cls =
    orientation === "vertical"
      ? `${base} w-px hover:w-1`
      : `${base} h-px hover:h-1`;
  return <Separator className={cls} />;
}

function SplitPanelLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-8 shrink-0 items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
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
    { id: "data", label: "Data" },
    { id: "json", label: "Pipeline JSON" },
  ];
  return (
    <div className="flex h-9 items-center gap-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2">
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
                ? "border-blue-500 text-gray-900 dark:text-gray-100"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100")
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
