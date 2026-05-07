import { createContext, useContext } from "react";

export interface StageNodeCallbacks {
  /**
   * Called when the user clicks a node's output-table link. The library does
   * not interpret this — typical wiring is to switch a "Data Schema" tab to
   * the matching stage.
   */
  onShowOutput?: (stageId: string) => void;
  /**
   * Called when the user clicks the per-node edit (pencil) icon. Distinct
   * from a plain node click — clients use this to open an edit form even
   * when single-click selection is suppressed (e.g. popover edit mode).
   */
  onEdit?: (stageId: string) => void;
}

export const StageNodeContext = createContext<StageNodeCallbacks>({});

export function useStageNodeCallbacks(): StageNodeCallbacks {
  return useContext(StageNodeContext);
}
