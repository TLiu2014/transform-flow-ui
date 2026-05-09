# transform-flow-ui

A reusable React UI module for visually building **data transformation pipelines**. Pure UI — no backend, no data execution, no AI. Bring your own engine (DuckDB, Spark, dbt, …) when you wire it into a real product.

---

## Two reusable modules

### Module 1 — Transformation Flow

A self-contained canvas + edit view. Drop it in and users can build, connect, and configure pipeline stages visually.

| Component | Role |
|---|---|
| `TransformationFlow` | Core canvas. Handles node layout, edge drawing, and the edit panel (popover or right-side panel). |
| `FlowCanvasToolbar` | Optional overlay toolbar — "Add stage" menu and popover-position picker. |
| `StageConfigUI` | Stage config form in isolation — use when you want to host the form in your own panel layout. |
| `AddStageMenu` | Standalone "Add stage" dropdown, composable anywhere. |
| `SaveFlowButton` | Button that calls `serializePipeline` and fires `onSave(schema)`. |

### Module 2 — Schema Viewer

Consume a `PipelineSchema` (from `serializePipeline` or a saved JSON file) to inspect the pipeline without a canvas.

| Component | Role |
|---|---|
| `DataSchemaView` | Tab strip per stage — shows inferred output columns and types. |
| `JsonView` | Raw pipeline JSON with copy and download buttons. |

### Optional helper

| Component | Role |
|---|---|
| `PipelineIOPanel` | Sample picker + file upload + JSON paste — a ready-made panel for loading schemas onto the canvas. Not required; wire schema loading however suits your app. |

---

## Features

- **Visual pipeline builder** on a `@xyflow/react` canvas — add, connect (from any of 4 sides), move, delete stages.
- **Eight stage types**: `LOAD`, `FILTER`, `JOIN`, `UNION`, `GROUP`, `SORT`, `SELECT`, `CUSTOM`.
- **Edit panel built in** — `configDisplayMode="popover"` floats the form next to the node; `"panel"` pins it as a right sidebar inside the canvas component.
- **Schema round-trip** — serialize canvas to JSON; deserialize JSON back to a live canvas.
- **Output schema inference** — derive each stage's output columns + types without execution.
- **Plain React state** — no Zustand, no Redux. The host app owns `nodes` / `edges` and passes them as props.
- **UI-lib-decoupled** — feature components depend only on internal `components/ui/*` primitives (shadcn/ui + Radix). Swap to another design system by replacing those files.

---

## Repository layout

```
transform-flow-ui/
├── src/                       library source (publishable)
│   ├── index.ts               public API
│   ├── Schema.ts              serialize / deserialize / validate / infer
│   ├── components/
│   │   ├── flow/              TransformationFlow, StageNode, FlowCanvasToolbar,
│   │   │                        PopoverStageEditor, StageEdgeHandles, …
│   │   ├── config/            StageConfigUI + per-type forms
│   │   ├── views/             DataSchemaView, JsonView
│   │   ├── io/                PipelineIOPanel
│   │   ├── toolbar/           AddStageMenu, SaveFlowButton
│   │   └── ui/                shadcn/ui primitives (swap point)
│   ├── types/Pipeline.ts      StageType, StageConfig, StageNodeData
│   └── lib/Utils.ts           cn() utility
├── tsup.config.ts             builds → dist/{index.js, index.cjs, index.d.ts}
└── demo/                      Vite app showcasing the library
    ├── src/App.tsx            three-pane layout wired to library exports
    └── samples/samples.json  sample pipeline schemas
```

---

## Run the demo

```bash
git clone https://github.com/TLiu2014/transform-flow-ui.git
cd transform-flow-ui
npm install
npm --prefix demo install
npm run demo          # → http://localhost:5173
```

The demo Vite config aliases `transform-flow-ui` → `../src/index.ts` so library source changes hot-reload without a rebuild.

---

## Installation

The package is currently `private: true`. Link it locally:

```json
{ "dependencies": { "transform-flow-ui": "file:../transform-flow-ui" } }
```

**Peer dependencies:**

```
react ≥ 18    react-dom ≥ 18    @xyflow/react ^12
```

Import xyflow's stylesheet once at the app shell:

```ts
import "@xyflow/react/dist/style.css";
```

**Tailwind v4** — add the library dist to Tailwind's source scan:

```css
@import "tailwindcss";
@source "../node_modules/transform-flow-ui/dist/**/*.{js,cjs}";
```

---

## Usage

### Module 1 — Transformation Flow

`TransformationFlow` owns the canvas and the edit panel. The host app owns `nodes` / `edges` state and handles add/update/delete.

```tsx
import { useState } from "react";
import { useNodesState, useEdgesState, addEdge, type Node } from "@xyflow/react";
import {
  TransformationFlow, FlowCanvasToolbar,
  defaultConfigFor, STAGE_LABELS,
  type StageNodeData, type StageType,
} from "transform-flow-ui";

export function PipelineEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StageNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toolbarOpen, setToolbarOpen] = useState(true);

  const editingNode = nodes.find(n => n.id === editingId) ?? null;

  const addStage = (stageType: StageType) => {
    const id = crypto.randomUUID();
    setNodes(ns => [...ns, {
      id, type: "stageNode",
      position: { x: 100, y: 80 + ns.length * 120 },
      data: {
        stageType, stageIndex: ns.length + 1,
        label: `${STAGE_LABELS[stageType]} #${ns.length + 1}`,
        config: defaultConfigFor(stageType),
      },
    }]);
    setEditingId(id);
  };

  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <FlowCanvasToolbar
        expanded={toolbarOpen} onExpandedChange={setToolbarOpen}
        onAddStage={addStage}
        editPanelPosition="right" onEditPanelPositionChange={() => {}}
      />
      <TransformationFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={c => setEdges(es => addEdge(c, es))}
        onNodeClick={n => setEditingId(n.id)}
        onNodeDoubleClick={n => setEditingId(n.id)}
        onPaneClick={() => setEditingId(null)}
        onEditNode={setEditingId}
        selectedNodeId={editingId}
        // Edit panel — "popover" (default) or "panel" (right sidebar)
        editingNode={editingNode}
        configDisplayMode="panel"
        onUpdateNode={(id, patch) =>
          setNodes(ns => ns.map(n =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))}
        onDeleteNode={id => {
          setNodes(ns => ns.filter(n => n.id !== id));
          setEdges(es => es.filter(e => e.source !== id && e.target !== id));
          setEditingId(cur => cur === id ? null : cur);
        }}
        onCancelEdit={() => setEditingId(null)}
      />
    </div>
  );
}
```

**`configDisplayMode` options:**

| Value | Behaviour |
|---|---|
| `"popover"` *(default)* | Edit form floats next to the selected node as a NodeToolbar popover. |
| `"panel"` | Edit form is pinned as a fixed-width right sidebar inside the component. |

#### Serialize to JSON

```ts
import { serializePipeline } from "transform-flow-ui";

const schema = serializePipeline(nodes, edges, { name: "my-pipeline" });
```

#### Load a schema onto the canvas

```ts
import { deserializePipeline, validatePipelineSchema } from "transform-flow-ui";

const err = validatePipelineSchema(raw);
if (err) throw new Error(err);
const { name, nodes, edges } = deserializePipeline(raw);
setNodes(nodes);
setEdges(edges);
```

---

### Module 2 — Schema Viewer

Pass any `PipelineSchema` — from `serializePipeline` or a saved file. No canvas needed.

```tsx
import { DataSchemaView, JsonView, serializePipeline } from "transform-flow-ui";

const schema = serializePipeline(nodes, edges, { name: "my-pipeline" });
```

```tsx
// Per-stage inferred output columns
<DataSchemaView
  schema={schema}
  activeStageId={activeStageId}
  onActiveStageIdChange={setActiveStageId}
/>
```

```tsx
// Raw JSON with copy / download
<JsonView
  schema={schema}
  refreshTick={tick}
  onRefresh={() => setTick(t => t + 1)}
/>
```

---

## Schema helpers

```ts
import {
  serializePipeline,      // (nodes, edges, { name }) → PipelineSchema
  deserializePipeline,    // (PipelineSchema) → { name, nodes, edges }
  validatePipelineSchema, // (unknown) → string | null  (null = valid)
  inferOutputSchemas,     // (PipelineSchema) → Map<stageId, StageOutputSchema>
} from "transform-flow-ui";
```

---

## Pipeline schema shape

```jsonc
{
  "version": "1.0",
  "pipeline": { "name": "my-pipeline", "createdAt": "…" },
  "datasets": {
    "customers": { "columns": [{ "name": "id", "type": "integer" }, …] }
  },
  // Topologically ordered — readable without the canvas
  "stages": [
    {
      "id": "n1", "name": "load_customers", "type": "LOAD",
      "depends_on": [], "inputs": [], "output": "customers",
      "operation": { "stageType": "LOAD", "tableName": "customers" }
    },
    {
      "id": "n2", "name": "filter_us", "type": "FILTER",
      "depends_on": ["n1"], "inputs": ["customers"], "output": "filtered",
      "operation": { "stageType": "FILTER", "table": "customers",
                     "column": "country", "operator": "=", "value": "US" }
    }
  ],
  // UI-only — safe to drop if you only need the data shape
  "layout": {
    "nodes": [{ "id": "n1", "position": { "x": 80, "y": 80 } }, …],
    "edges": [{ "id": "e1", "source": "n1", "target": "n2" }]
  }
}
```

---

## Scripts

| Script | What it does |
|---|---|
| `npm run build` | Build library to `dist/` (ESM + CJS + `.d.ts`) |
| `npm run dev` | tsup in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run demo` | Start demo dev server |
| `npm run demo:build` | Production build of demo |

## Tech stack

React 19 · TypeScript · `@xyflow/react` v12 · Tailwind CSS v4 · shadcn/ui (Radix) · Vite · tsup
