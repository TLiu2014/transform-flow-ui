import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "./DataTable";
import { getMockResultFor } from "@/mocks/tables";
import type { Node } from "@xyflow/react";
import type { StageNodeData } from "@/types/pipeline";
import { STAGE_COLORS } from "@/types/pipeline";

interface ResultsTabViewProps {
  nodes: Node<StageNodeData>[];
}

export function ResultsTabView({ nodes }: ResultsTabViewProps) {
  const tabs = nodes
    .filter((n) => n.data.outputTableName)
    .sort((a, b) => a.data.stageIndex - b.data.stageIndex);

  if (tabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
        No stage outputs yet. Add and configure a stage to see mock results here.
      </div>
    );
  }

  const defaultValue = tabs[0]?.id;

  return (
    <Tabs defaultValue={defaultValue} className="flex h-full flex-col">
      <TabsList>
        {tabs.map((n) => (
          <TabsTrigger key={n.id} value={n.id}>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STAGE_COLORS[n.data.stageType] }}
            />
            <span className="font-mono text-xs">{n.data.outputTableName}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((n) => (
        <TabsContent key={n.id} value={n.id}>
          <DataTable table={getMockResultFor(n.data.outputTableName!)} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
