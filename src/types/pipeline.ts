export type StageType =
  | "LOAD"
  | "FILTER"
  | "JOIN"
  | "UNION"
  | "GROUP"
  | "SORT"
  | "SELECT"
  | "CUSTOM";

export type FilterOperator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN";
export type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL OUTER";
export type SortDirection = "ASC" | "DESC";
export type AggregateFn = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";

export interface LoadConfig {
  stageType: "LOAD";
  tableName: string;
  source?: string;
}

export interface FilterConfig {
  stageType: "FILTER";
  table: string;
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface JoinConfig {
  stageType: "JOIN";
  joinType: JoinType;
  leftTable: string;
  rightTable: string;
  leftKey: string;
  rightKey: string;
}

export interface UnionConfig {
  stageType: "UNION";
  tables: string[];
  unionAll: boolean;
}

export interface GroupAggregation {
  fn: AggregateFn;
  column: string;
  alias: string;
}

export interface GroupConfig {
  stageType: "GROUP";
  table: string;
  groupBy: string[];
  aggregations: GroupAggregation[];
}

export interface SortOrder {
  column: string;
  direction: SortDirection;
}

export interface SortConfig {
  stageType: "SORT";
  table: string;
  orderBy: SortOrder[];
}

export interface SelectConfig {
  stageType: "SELECT";
  table: string;
  columns: string[];
}

export interface CustomConfig {
  stageType: "CUSTOM";
  sql: string;
}

export type StageConfig =
  | LoadConfig
  | FilterConfig
  | JoinConfig
  | UnionConfig
  | GroupConfig
  | SortConfig
  | SelectConfig
  | CustomConfig;

export type ExecutionState = "pending" | "running" | "success" | "error";

export interface StageNodeData {
  stageType: StageType;
  label: string;
  stageIndex: number;
  outputTableName?: string;
  executionState?: ExecutionState;
  config: StageConfig;
  /** Overrides the default per-stage-type color when set. */
  color?: string;
  /** Overrides the type label shown on the node and in the config header. */
  displayType?: string;
  [key: string]: unknown;
}

export const STAGE_COLORS: Record<StageType, string> = {
  LOAD: "#34a853",
  FILTER: "#f59e0b",
  JOIN: "#3b82f6",
  UNION: "#a855f7",
  GROUP: "#ec4899",
  SORT: "#06b6d4",
  SELECT: "#14b8a6",
  CUSTOM: "#6b7280",
};

export interface TagColor {
  key: string;
  label: string;
  value: string;
}

export const TAG_COLORS: TagColor[] = [
  { key: "gray", label: "Gray", value: "#6b7280" },
  { key: "red", label: "Red", value: "#ef4444" },
  { key: "orange", label: "Orange", value: "#f97316" },
  { key: "amber", label: "Amber", value: "#f59e0b" },
  { key: "yellow", label: "Yellow", value: "#eab308" },
  { key: "lime", label: "Lime", value: "#84cc16" },
  { key: "green", label: "Green", value: "#22c55e" },
  { key: "teal", label: "Teal", value: "#14b8a6" },
  { key: "cyan", label: "Cyan", value: "#06b6d4" },
  { key: "blue", label: "Blue", value: "#3b82f6" },
  { key: "indigo", label: "Indigo", value: "#6366f1" },
  { key: "purple", label: "Purple", value: "#a855f7" },
  { key: "pink", label: "Pink", value: "#ec4899" },
  { key: "rose", label: "Rose", value: "#f43f5e" },
];

export function getStageColor(data: Pick<StageNodeData, "stageType" | "color">): string {
  return data.color ?? STAGE_COLORS[data.stageType];
}

export const STAGE_LABELS: Record<StageType, string> = {
  LOAD: "Load",
  FILTER: "Filter",
  JOIN: "Join",
  UNION: "Union",
  GROUP: "Group By",
  SORT: "Sort",
  SELECT: "Select",
  CUSTOM: "Custom SQL",
};

export function defaultConfigFor(stageType: StageType): StageConfig {
  switch (stageType) {
    case "LOAD":
      return { stageType, tableName: "input", source: "" };
    case "FILTER":
      return { stageType, table: "", column: "", operator: "=", value: "" };
    case "JOIN":
      return {
        stageType,
        joinType: "INNER",
        leftTable: "",
        rightTable: "",
        leftKey: "",
        rightKey: "",
      };
    case "UNION":
      return { stageType, tables: [], unionAll: false };
    case "GROUP":
      return { stageType, table: "", groupBy: [], aggregations: [] };
    case "SORT":
      return { stageType, table: "", orderBy: [] };
    case "SELECT":
      return { stageType, table: "", columns: [] };
    case "CUSTOM":
      return { stageType, sql: "" };
  }
}
