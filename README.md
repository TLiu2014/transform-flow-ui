# transform-flow-ui

A reusable React UI module for visually building **data transformation pipelines**. Drag-and-drop transformation stages on a flow canvas, configure each stage's parameters in a sidebar, and round-trip the whole pipeline as a data-engineer-readable JSON schema.

The module is **pure UI** — no backend, no data execution, no AI. Bring your own engine (DuckDB, Spark, dbt, …) when you wire it into a real product.

## Features

- 🎨 **Visual pipeline builder** on a `@xyflow/react` canvas — add, connect, move, delete transformation stages.
- 🧩 **Eight stage types** out of the box: `LOAD`, `FILTER`, `JOIN`, `UNION`, `GROUP`, `SORT`, `SELECT`, `CUSTOM`.
- 📝 **Per-stage configuration sidebar** with type-specific forms (operators, join keys, group-by + aggregations, raw SQL, …).
- 📤 **Save → JSON** in a structured shape designed for data engineers — `pipeline` / `datasets` / `stages` / `layout`.
- 📥 **Load JSON → flow** — paste or upload a saved schema and the canvas rebuilds itself.
- 🧮 **Output schema inference** — given a pipeline, derive each stage's output columns + types without execution. Powers a "Data Schema" panel in the demo.
- 🔌 **UI-lib-decoupled** — feature components only depend on internal `components/ui/*` primitives (currently shadcn/ui + Radix). Swap to MUI / your-design-system later by replacing those eight primitive files; feature components stay untouched.
- 🪶 **Plain React state** — no Zustand, no Redux. Parents own `nodes` / `edges` / `selectedNodeId` and pass them down.

## Repository layout

```
transform-flow-ui/
├── src/                      ← library source (publishable)
│   ├── index.ts              public API
│   ├── schema.ts             serialize / deserialize / validate / infer
│   ├── components/
│   │   ├── flow/             TransformationFlow + StageNode
│   │   ├── config/           StageConfigUI + per-type forms
│   │   ├── results/          ResultsTabView + DataTable (mock-data view)
│   │   ├── toolbar/          AddStageMenu, SaveFlowButton
│   │   └── ui/               shadcn/ui primitives (swap point for other UI libs)
│   ├── types/pipeline.ts     StageType, StageConfig union, StageNodeData
│   └── mocks/                quickstart datasets + sample pipeline
├── tsup.config.ts            library build → dist/{index.js, index.cjs, index.d.ts}
├── tsconfig.lib.json
├── demo/                     ← Vite app showcasing the library
│   ├── src/App.tsx           three-pane layout
│   ├── src/PipelineIOPanel   paste / upload JSON to load a pipeline
│   ├── src/DataSchemaView    per-stage inferred-schema tabs
│   ├── vite.config.ts        aliases `transform-flow-ui` → `../src/index.ts`
│   └── package.json          consumes the library via `file:..`
└── package.json              library entry, peer-deps, scripts
```

## Run the demo

```bash
git clone https://github.com/TLiu2014/transform-flow-ui.git
cd transform-flow-ui
npm install                  # install library deps
npm --prefix demo install    # install demo deps
npm run demo                 # → http://localhost:5173
```

`npm run demo` is shorthand for `npm --prefix demo run dev`. The demo's Vite config aliases `transform-flow-ui` to `../src/index.ts`, so any change to library source hot-reloads in the demo without a rebuild.

### What the demo shows

- **Header** — pipeline name, **Add stage** menu, **Save → console** button (logs the schema and shows a toast).
- **Left pane — Pipeline I/O** — paste or upload a saved schema JSON; the canvas re-renders.
- **Center top — Flow canvas** — drag stages, connect ports, click a node to configure it.
- **Center bottom — Data Schema** — one tab per stage output, listing inferred columns + types. Source columns from `LOAD` are marked `source`; downstream columns are marked `inferred`.
- **Right pane — Stage Configuration** — type-specific form for the selected node, with **Save changes** to commit edits.

There's no backend. **Save → console** prints the schema; open DevTools to inspect it. **Load** parses pasted/uploaded JSON, validates it, and rebuilds the canvas.

## Use the library

### Build & link

```bash
npm install                 # install deps
npm run build               # tsup → dist/{index.js, index.cjs, index.d.ts}
npm run typecheck           # tsc --noEmit
```

The package is currently `private: true`. To consume it from another local project today, link it in your consumer's `package.json`:

```json
{
  "dependencies": {
    "transform-flow-ui": "file:../transform-flow-ui"
  }
}
```

Peer deps required by the consumer: `react`, `react-dom`, `@xyflow/react`. The consumer must also import xyflow's stylesheet once at the app shell:

```ts
import "@xyflow/react/dist/style.css";
```

Tailwind is recommended (the library ships JSX with Tailwind utility classes). Tailwind v4 example:

```css
@import "tailwindcss";
@source "../node_modules/transform-flow-ui/dist/**/*.{js,cjs}";
```

### Minimal example

```tsx
import { useCallback, useState } from "react";
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
  SaveFlowButton,
  StageConfigUI,
  TransformationFlow,
  defaultConfigFor,
  STAGE_LABELS,
  SAMPLE_NODES,
  SAMPLE_EDGES,
  type StageNodeData,
  type StageType,
  type PipelineSchema,
} from "transform-flow-ui";

export default function MyPipelineEditor() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<StageNodeData>>(SAMPLE_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(SAMPLE_EDGES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConnect = useCallback(
    (c: Connection) => setEdges((es) => addEdge(c, es)),
    [setEdges],
  );

  const handleAdd = (stageType: StageType) => {
    const id = crypto.randomUUID();
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "stageNode",
        position: { x: 100, y: 100 + ns.length * 80 },
        data: {
          stageType,
          label: `${STAGE_LABELS[stageType]} #${ns.length + 1}`,
          stageIndex: ns.length + 1,
          config: defaultConfigFor(stageType),
        },
      },
    ]);
    setSelectedId(id);
  };

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="grid h-screen grid-cols-[1fr_320px]">
      <main>
        <AddStageMenu onAdd={handleAdd} />
        <SaveFlowButton
          name="my-pipeline"
          nodes={nodes}
          edges={edges}
          onSave={(s: PipelineSchema) => console.log(s)}
        />
        <TransformationFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={(n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          selectedNodeId={selectedId}
        />
      </main>
      <aside>
        <StageConfigUI
          node={selected}
          onUpdate={(id, patch) =>
            setNodes((ns) =>
              ns.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
              ),
            )
          }
          onDelete={(id) => {
            setNodes((ns) => ns.filter((n) => n.id !== id));
            setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
            setSelectedId((cur) => (cur === id ? null : cur));
          }}
        />
      </aside>
    </div>
  );
}
```

### Schema helpers

```ts
import {
  serializePipeline,      // (nodes, edges, { name, description? }) → PipelineSchema
  deserializePipeline,    // (PipelineSchema) → { name, nodes, edges }
  validatePipelineSchema, // (unknown) → string | null  (error message or null)
  inferOutputSchemas,     // (PipelineSchema) → Map<stageId, StageOutputSchema>
} from "transform-flow-ui";
```

## Pipeline schema shape

```jsonc
{
  "version": "1.0",
  "pipeline": { "name": "us-customer-orders", "createdAt": "2026-05-06T..." },

  // Input data schemas (currently derived from LOAD stages)
  "datasets": {
    "customers": {
      "columns": [
        { "name": "id", "type": "integer" },
        { "name": "name", "type": "string" },
        { "name": "country", "type": "string" }
      ]
    }
  },

  // Topologically ordered DAG — readable without the canvas
  "stages": [
    {
      "id": "n1",
      "name": "load_customers",
      "type": "LOAD",
      "depends_on": [],
      "inputs": [],
      "output": "customers",
      "operation": { "stageType": "LOAD", "tableName": "customers", "source": "customers.csv" }
    },
    {
      "id": "n2",
      "name": "filter_us_customers",
      "type": "FILTER",
      "depends_on": ["n1"],
      "inputs": ["customers"],
      "output": "filtered_customers",
      "operation": { "stageType": "FILTER", "table": "customers", "column": "country", "operator": "=", "value": "US" }
    }
  ],

  // Layout — UI-only, droppable if you only care about the data
  "layout": {
    "nodes": [
      { "id": "n1", "position": { "x": 80, "y": 80 } },
      { "id": "n2", "position": { "x": 80, "y": 240 } }
    ],
    "edges": [{ "id": "e1-2", "source": "n1", "target": "n2" }]
  }
}
```

## Scripts

| Script                          | What it does                                           |
| ------------------------------- | ------------------------------------------------------ |
| `npm run build`                 | Build the library to `dist/` (ESM + CJS + `.d.ts`).    |
| `npm run dev`                   | Run tsup in watch mode.                                |
| `npm run typecheck`             | `tsc --noEmit` against `tsconfig.lib.json`.            |
| `npm run demo`                  | Start the demo dev server.                             |
| `npm run demo:build`            | Production build of the demo (`demo/dist/`).           |
| `npm --prefix demo run preview` | Preview the production demo build.                     |

## Tech stack

React 19 · TypeScript · `@xyflow/react` v12 · Tailwind CSS v4 · shadcn/ui (Radix primitives) · Vite (demo) · tsup (library bundler).
