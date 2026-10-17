import { useCallback, useMemo } from "react";
import { useAppStore } from "@/components/state-provider";
import { useResponsiveBreakpoint } from "@/hooks/use-responsive-breakpoint";
import { linkToTask, linkToTaskOverview } from "@/lib/links";
import { useRouter, useSearchParams } from "@/lib/routing/client-router";
import { setStoredTaskListingView } from "@/lib/task-listing/view-preference";

export const TASK_GRAPH_PANEL = "task-graph";

export type OpenTaskGraph = {
  /** The task's own graph: workbench tab (desktop) or sheet (phones), via `?panel=`. */
  openTab: (taskId: string) => void;
  /** The board Graph view focused on the task; phones fall back to the sheet. */
  showInGraph: (taskId: string, workflowId?: string) => void;
};

export function useOpenTaskGraph(): OpenTaskGraph {
  const router = useRouter();
  const current = useSearchParams();
  const { isMobile } = useResponsiveBreakpoint();
  // Nil-safe: menus can render before these slices hydrate.
  const activeTaskId = useAppStore((state) => state.tasks?.activeTaskId ?? null);
  const workspaceId = useAppStore((state) => state.workspaces?.activeId ?? undefined);

  const openTab = useCallback(
    (taskId: string) => {
      if (taskId === activeTaskId) {
        router.replace(linkToTask(taskId, { panel: TASK_GRAPH_PANEL, searchParams: current }));
      } else {
        router.push(linkToTask(taskId, { panel: TASK_GRAPH_PANEL }));
      }
    },
    [router, current, activeTaskId],
  );

  const showInGraph = useCallback(
    (taskId: string, workflowId?: string) => {
      if (isMobile) {
        openTab(taskId);
        return;
      }
      setStoredTaskListingView("graph");
      router.push(linkToTaskOverview({ workspaceId, workflowId, graphFocusTaskId: taskId }));
    },
    [isMobile, openTab, router, workspaceId],
  );

  return useMemo(() => ({ openTab, showInGraph }), [openTab, showInGraph]);
}
