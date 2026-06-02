# Pipeline JSON Schema

This document describes the JSON shape that `transform-flow-ui` emits via
`serializePipeline(...)` and accepts back via `deserializePipeline(...)`. It is
the contract between the UI and any host that wants to persist, validate, or
execute the pipeline.

Source of truth: [`src/Schema.ts`](../src/Schema.ts) and
[`src/types/Pipeline.ts`](../src/types/Pipeline.ts).

---

## Top-level object

```jsonc
{
  "version": "1.0",
  "pipeline": { "name": "...", "createdAt": "...", "description": "..." },
  "datasets": { "<tableName>": { "columns": [...] } },
  "stages":   [ /* SerializedStage[], topologically ordered */ ],
  "layout":   { "nodes": [...], "edges": [...] }
}
```

| Field      | Type                                    | Required | Purpose                                                                 |
|------------|-----------------------------------------|----------|-------------------------------------------------------------------------|
| `version`  | `"1.0"`                                 | yes      | Schema version. Anything else fails `validatePipelineSchema`.           |
| `pipeline` | object                                  | yes      | Top-level metadata (name, timestamp, optional description).             |
| `datasets` | `Record<string, DatasetSchema>`         | yes      | Declared input data sources. Keyed by table name.                       |
| `stages`   | `SerializedStage[]`                     | yes      | Ordered DAG of transformations.                                         |
| `layout`   | `{ nodes, edges }`                      | yes      | UI-only canvas state (positions + edges). Safe to drop for engine use.  |

> The `stages` array carries all the *data semantics*. The `layout` block is
> there only so the canvas can round-trip; an engine that consumes this JSON
> can ignore `layout` entirely.

---

## `pipeline` — metadata

```jsonc
{
  "name": "monthly_revenue",      // user-set pipeline name
  "createdAt": "2026-05-28T15:30:00.000Z",  // ISO timestamp, set on serialize
  "description": "..."            // optional, omitted if blank
}
```

`createdAt` is regenerated every time `serializePipeline` runs. It reflects
last-emitted time, not original creation time.

---

## `datasets` — declared inputs

```jsonc
{
  "datasets": {
    "customers": {
      "columns": [
        { "name": "id",      "type": "integer" },
        { "name": "country", "type": "string"  }
      ]
    }
  }
}
```

- Keyed by **table name** (what `LOAD` stages reference).
- `columns` may be empty — the UI auto-creates an entry per `LOAD` stage but
  doesn't infer columns. A host (or human) populates them.
- `ColumnType` is one of: `"integer" | "float" | "string" | "boolean" | "date" | "timestamp" | "unknown"`.

`serializePipeline` only auto-fills entries for tables referenced by `LOAD`
stages. Other tables in `datasets` are preserved as-is across round-trips.

---

## `stages` — the DAG

Every stage has the same envelope:

```jsonc
{
  "id": "n1abc23",                   // stable node id
  "name": "filter_us_customers",     // slug derived from the user-facing label
  "type": "FILTER",                  // one of the StageType values below
  "depends_on": ["n0xyz45"],         // upstream stage ids (graph edges → this node)
  "inputs": ["customers"],           // upstream TABLE NAMES (derived from operation params)
  "output": "filter_2",              // the output table name this stage produces
  "operation": { /* StageConfig */ }, // type-specific parameters, see "Operations" below
  "color":       "#22c55e",          // optional — user color override (hex)
  "displayType": "Cohort filter"     // optional — user label override for the type badge
}
```

### Two parallel notions of "upstream"

This is the most common source of confusion when consuming the JSON:

- **`depends_on`** — graph-level. Comes from the *visual edges* on the canvas
  (whatever the user drew). Lists upstream **stage ids**.
- **`inputs`** — data-level. Derived from the *operation parameters*
  (`FILTER.table`, `JOIN.leftTable`/`rightTable`, `UNION.tables`, etc.). Lists
  upstream **table names**, i.e. other stages' `output` values or `datasets`
  keys.

Both are reported because:
- An engine cares about `inputs` — they tell it what tables to feed in.
- A graph viewer / linter cares about `depends_on` — it tells you what the
  user drew. Differences between the two indicate that the visual graph and
  the operation parameters have drifted apart (the UI does not enforce
  consistency).

### `output`

- If the user set an explicit "Output table name" on the node, that wins.
- Otherwise it falls back to `<stageType_lower>_<stageIndex>`, e.g. `filter_2`.

Downstream stages reference upstream `output` values inside `operation.table`
(or `leftTable`/`rightTable`/`tables`).

### Ordering

`stages` is emitted in **topological order** based on `depends_on`. A cycle
(shouldn't happen in normal use, since the canvas allows them in principle)
falls back to the original node order with the cycle members appended last.

### Optional UI fields

- `color` — hex string. Omitted if the user is using the type-default color.
- `displayType` — string shown on the node badge instead of the raw `type`
  (e.g. type `SORT` displayed as `Order by`). Omitted if blank.

Engines should ignore these.

---

## Operations (per `StageType`)

`operation.stageType` always equals the stage's `type`. The rest of the
fields vary.

### `LOAD`

Materializes a base table from a declared dataset.

```jsonc
"operation": {
  "stageType": "LOAD",
  "tableName": "customers",         // dataset key in `datasets`
  "source":    "customers.csv"      // optional — origin path/URI, opaque to the UI
}
```

`inputs`: `[]` (LOAD has no upstream tables). The presence of a `LOAD` adds
its `tableName` to `datasets` on serialize if not already there.

### `FILTER`

Row predicate.

```jsonc
"operation": {
  "stageType": "FILTER",
  "table":    "customers",
  "column":   "country",
  "operator": "=",                 // "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN"
  "value":    "US"
}
```

`inputs`: `[table]` if non-empty.

### `JOIN`

```jsonc
"operation": {
  "stageType": "JOIN",
  "joinType":   "INNER",            // "INNER" | "LEFT" | "RIGHT" | "FULL OUTER"
  "leftTable":  "customers",
  "rightTable": "orders",
  "leftKey":    "id",
  "rightKey":   "customer_id"
}
```

`inputs`: `[leftTable, rightTable]` (empty strings filtered out).

### `UNION`

```jsonc
"operation": {
  "stageType": "UNION",
  "tables":   ["q1_sales", "q2_sales"],
  "unionAll": true                  // false → de-duplicate, true → keep duplicates
}
```

`inputs`: the `tables` array verbatim.

### `GROUP`

```jsonc
"operation": {
  "stageType": "GROUP",
  "table":    "orders",
  "groupBy":  ["customer_id"],
  "aggregations": [
    { "fn": "SUM",   "column": "amount", "alias": "total" },
    { "fn": "COUNT", "column": "*",      "alias": "n"     }
  ]
}
```

- `fn` ∈ `"COUNT" | "SUM" | "AVG" | "MIN" | "MAX"`.
- `alias` is the output column name. If blank, the inferred-schema panel
  falls back to `<fn_lower>_<column>`.

`inputs`: `[table]` if non-empty.

### `SORT`

```jsonc
"operation": {
  "stageType": "SORT",
  "table":   "orders",
  "orderBy": [{ "column": "amount", "direction": "DESC" }]
}
```

`direction` ∈ `"ASC" | "DESC"`.

The UI editor currently exposes a single sort key; the schema is an array,
so external tooling can store multi-key sorts.

`inputs`: `[table]` if non-empty.

### `SELECT`

Column projection.

```jsonc
"operation": {
  "stageType": "SELECT",
  "table":   "customers",
  "columns": ["id", "country"]
}
```

`inputs`: `[table]` if non-empty.

### `PIVOT`

Wide format. New columns come from distinct values of `columnsColumn`.

```jsonc
"operation": {
  "stageType": "PIVOT",
  "table":         "sales",
  "indexColumn":   "region",        // becomes the row identifier
  "columnsColumn": "quarter",       // distinct values become new columns
  "valuesColumn":  "revenue",       // aggregated per cell
  "aggregation":   "SUM"            // AggregateFn
}
```

`inputs`: `[table]` if non-empty.

> Schema inference reports `columns: []` with `unknown: true` — pivoted
> column names depend on data the UI never sees.

### `UNPIVOT`

Long format. Melts wide columns into rows.

```jsonc
"operation": {
  "stageType": "UNPIVOT",
  "table":         "sales_wide",
  "idColumns":     ["region", "year"],   // kept as-is
  "valueColumns":  ["q1", "q2", "q3", "q4"], // melted
  "nameColumn":    "quarter",            // output column for the column-name
  "valueColumn":   "revenue"             // output column for the value
}
```

`inputs`: `[table]` if non-empty.

### `CUSTOM`

```jsonc
"operation": {
  "stageType": "CUSTOM",
  "sql": "SELECT * FROM ..."
}
```

`inputs`: `[]` (the UI cannot parse SQL to discover dependencies; if you
need them, populate `depends_on` via edges on the canvas).

Schema inference reports `unknown: true` for CUSTOM — the UI can't know the
output columns without executing the SQL.

---

## `layout` — UI round-trip (optional to consumers)

```jsonc
{
  "layout": {
    "nodes": [{ "id": "n1abc23", "position": { "x": 80, "y": 240 } }],
    "edges": [{ "id": "e1",      "source": "n0xyz45", "target": "n1abc23" }]
  }
}
```

- `nodes[].position` lets `deserializePipeline` restore the canvas. If a
  node's position is missing on load, the UI lays it out automatically.
- `edges` lists the connections the user drew. This is what `depends_on` is
  derived from. Note that the canvas's *handle* (top/left/right/bottom) is
  **not** persisted here; the UI re-defaults handles on load.

Hosts that only consume the data may ignore `layout` entirely.

---

## AI / agent payload

The model is treated as a **stateless processor**: feed it the data
contract (datasets + stages), get SQL back. Everything else — pipeline
name, description, schema version, canvas layout, node colors — is
host-side bookkeeping. It belongs in the prompt scaffolding or the UI
state, not in the payload.

The transformation library does **not** itself send anything — this is a
pure UI module. The host is responsible for the network round trip. The
helpers below produce the minimal payload and read the model's response
back.

> *Note:* this library never executes data or contacts a backend. The demo
> app shows the JSON in a panel; integration with an AI/SQL engine is the
> host's responsibility.

### Shape

```ts
interface AIPipelineSchema {
  datasets: Record<string, DatasetSchema>;
  stages: AIPipelineStage[];
}

interface AIPipelineStage {
  id: string;
  name: string;
  type: StageType;
  depends_on: string[];
  inputs: string[];
  output: string;
  operation: StageConfig;
}
```

What's dropped vs the UI's `PipelineSchema`:

| Field                  | Why dropped                                                   |
|------------------------|---------------------------------------------------------------|
| `version`              | Not enforceable by the model; belongs in host validation.     |
| `pipeline.name`        | Cosmetic for SQL; pass via prompt if needed.                  |
| `pipeline.description` | Belongs in the prompt as intent context, not the payload.     |
| `pipeline.createdAt`   | No SQL signal.                                                |
| `layout`               | UI-only; positions don't generate SQL.                        |
| stage `color`          | UI-only.                                                      |
| stage `displayType`    | UI-only.                                                      |

The fields that remain (`datasets`, `stages`, `operation`) are identical
to the UI schema — so the doc sections above are the source of truth for
stage semantics.

### Converters

Exported from the library:

```ts
import {
  toAISchema,           // PipelineSchema → AIPipelineSchema
  fromAISchema,         // AIPipelineSchema → PipelineSchema
  validateAIPipelineSchema,
} from "transform-flow-ui";
```

**Outgoing — `toAISchema(schema)`**

```ts
const aiPayload = toAISchema(serializePipeline(nodes, edges, { name }));
// → { datasets, stages } — everything else stripped
```

No options. The conversion is total.

**Incoming — `fromAISchema(ai, options?)`**

```ts
const next = fromAISchema(modelResponse, { base: currentSchema });
// → full PipelineSchema reconstructed from the model's datasets+stages,
//   with pipeline metadata, layout, color, and displayType pulled back
//   from `base` for any stage whose id was preserved.
```

| Option | Type             | Effect                                                                 |
|--------|------------------|------------------------------------------------------------------------|
| `base` | `PipelineSchema` | Source of UI/host metadata: `pipeline.{name,description,createdAt}`, layout positions, and per-stage `color` / `displayType`. |

Behavior detail when `base` is provided:
- Stages with matching `id` keep their previous `color` / `displayType`.
- Stages the model added (no matching id) come back without overrides.
- Stages the model removed are dropped from `layout` too.
- New stages get auto-laid-out on the canvas (their layout entry is just
  absent; `deserializePipeline` falls back to a default position).
- `pipeline.name` / `description` / `createdAt` are copied from `base`. If
  no `base` was passed, a placeholder name and `createdAt = now` are used.

**Validating an incoming response — `validateAIPipelineSchema(value)`**

Returns `null` if valid, otherwise a short error string. Checks only:
- value is an object;
- `datasets` is an object;
- `stages` is an array.

It does **not** validate per-stage operation shapes — wrap with Zod or the
host's own validator if accepting untrusted responses.

### Suggested round trip

```ts
// 1. UI → minimal payload for the backend / model
const ai = toAISchema(currentSchema);
const body = JSON.stringify(ai);

// 2. Host posts `body` to its backend; backend invokes the model. The
//    model returns either SQL (engine-side concern) or a modified
//    AIPipelineSchema (host's call, per the prompt design).

// 3. If the response is a pipeline, parse and import:
const parsed = JSON.parse(responseText);
const err = validateAIPipelineSchema(parsed);
if (err) throw new Error(err);
const nextSchema = fromAISchema(parsed, { base: currentSchema });
// → feed nextSchema into <TransformationFlow schema={nextSchema} />
```

### Minimal example

`PipelineSchema` from the [end-to-end example](#end-to-end-example) becomes,
after `toAISchema(...)`:

```jsonc
{
  "datasets": {
    "customers": {
      "columns": [
        { "name": "id",      "type": "integer" },
        { "name": "country", "type": "string"  },
        { "name": "email",   "type": "string"  }
      ]
    }
  },
  "stages": [
    {
      "id":         "n_load",
      "name":       "load_customers",
      "type":       "LOAD",
      "depends_on": [],
      "inputs":     [],
      "output":     "customers",
      "operation":  { "stageType": "LOAD", "tableName": "customers", "source": "customers.csv" }
    },
    {
      "id":         "n_filter",
      "name":       "us_only",
      "type":       "FILTER",
      "depends_on": ["n_load"],
      "inputs":     ["customers"],
      "output":     "filter_2",
      "operation":  {
        "stageType": "FILTER",
        "table":     "customers",
        "column":    "country",
        "operator":  "=",
        "value":     "US"
      }
    }
  ]
}
```

Everything cosmetic is gone — only what the model needs to write SQL.

---

## Validation

`validatePipelineSchema(value)` does a lightweight runtime check before
calling `deserializePipeline`. It returns `null` when the value is valid,
otherwise a short error string. It checks:

- value is an object;
- `version === "1.0"`;
- `pipeline`, `stages`, `layout` are present and roughly the right shape.

It does **not** validate the per-stage `operation` shape — that's left to
TypeScript at compile time. Hosts accepting untrusted JSON should add their
own per-stage validation (e.g. Zod) on top.

---

## End-to-end example

A two-stage pipeline: load `customers`, filter to US.

```jsonc
{
  "version": "1.0",
  "pipeline": {
    "name": "us_customers",
    "createdAt": "2026-05-28T15:30:00.000Z"
  },
  "datasets": {
    "customers": {
      "columns": [
        { "name": "id",      "type": "integer" },
        { "name": "country", "type": "string"  },
        { "name": "email",   "type": "string"  }
      ]
    }
  },
  "stages": [
    {
      "id":         "n_load",
      "name":       "load_customers",
      "type":       "LOAD",
      "depends_on": [],
      "inputs":     [],
      "output":     "customers",
      "operation":  {
        "stageType": "LOAD",
        "tableName": "customers",
        "source":    "customers.csv"
      }
    },
    {
      "id":         "n_filter",
      "name":       "us_only",
      "type":       "FILTER",
      "depends_on": ["n_load"],
      "inputs":     ["customers"],
      "output":     "filter_2",
      "operation":  {
        "stageType": "FILTER",
        "table":     "customers",
        "column":    "country",
        "operator":  "=",
        "value":     "US"
      }
    }
  ],
  "layout": {
    "nodes": [
      { "id": "n_load",   "position": { "x":  80, "y":  80 } },
      { "id": "n_filter", "position": { "x": 320, "y":  80 } }
    ],
    "edges": [
      { "id": "e1", "source": "n_load", "target": "n_filter" }
    ]
  }
}
```

---

## Consumer cheat sheet

If you're plugging an execution engine in behind this UI:

- Read `stages` in array order — it's already topologically sorted.
- For each stage, resolve `inputs` against `datasets` (LOAD source-of-truth)
  and prior `stages[].output`.
- Treat `layout`, `color`, `displayType`, and `pipeline.createdAt` as
  display metadata; preserve them on save so the UI doesn't lose state.
- For round-tripping arbitrary host metadata, attach it under a namespaced
  key inside `pipeline` or each stage at your own risk — the current
  validator ignores unknown keys, but future versions may not.
