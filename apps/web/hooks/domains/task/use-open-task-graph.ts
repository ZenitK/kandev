import { useCallback } from "react";
import { useAppStore } from "@/components/state-provider";
import { linkToTask } from "@/lib/links";
import { useRouter, useSearchParams } from "@/lib/routing/client-router";

export const TASK_GRAPH_PANEL = "task-graph";

/**
 * Show a task in the graph. Every entry point routes through
 * `?panel=task-graph`, which `TaskGraphPanelRequest` fulfils per form factor.
 */
export function useOpenTaskGraph(): (taskId: string) => void {
  const router = useRouter();
  const current = useSearchParams();
  // Nil-safe: menus can render before the tasks slice hydrates.
  const activeTaskId = useAppStore((state) => state.tasks?.activeTaskId ?? null);
  return useCallback(
    (taskId: string) => {
      if (taskId === activeTaskId) {
        router.replace(linkToTask(taskId, { panel: TASK_GRAPH_PANEL, searchParams: current }));
      } else {
        router.push(linkToTask(taskId, { panel: TASK_GRAPH_PANEL }));
      }
    },
    [router, current, activeTaskId],
  );
}
