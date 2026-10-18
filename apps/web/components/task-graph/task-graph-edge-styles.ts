import type { TaskGraphEdgeStatus } from "@/lib/api/domains/task-graph-api";

/** Line style per edge verdict; never color alone (dash pattern + legend text). */
export const TASK_GRAPH_EDGE_STYLES: Record<
  TaskGraphEdgeStatus,
  { stroke: string; strokeDasharray?: string; strokeWidth: number }
> = {
  resolved: { stroke: "var(--muted-foreground)", strokeWidth: 1.5 },
  pending: { stroke: "var(--primary)", strokeDasharray: "6 4", strokeWidth: 1.5 },
  failed: { stroke: "var(--destructive)", strokeWidth: 2.5 },
};
