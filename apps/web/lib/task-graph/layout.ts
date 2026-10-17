import dagre from "@dagrejs/dagre";
import type { TaskGraphModel } from "./model";

// The only importer of dagre (ADR 2026-10-17-task-graph-renderer-boundary).

export const TASK_GRAPH_NODE_WIDTH = 220;
export const TASK_GRAPH_NODE_HEIGHT = 88;
const COLUMN_GAP = 72;
const ROW_GAP = 24;

export type TaskGraphNodeBox = { x: number; y: number; width: number; height: number };
export type TaskGraphLayout = Map<string, TaskGraphNodeBox>;

/** Top-left node boxes; the column always equals the model step. */
export function layoutTaskGraph(model: TaskGraphModel): TaskGraphLayout {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: ROW_GAP, ranksep: COLUMN_GAP });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of model.nodes) {
    g.setNode(n.id, { width: TASK_GRAPH_NODE_WIDTH, height: TASK_GRAPH_NODE_HEIGHT });
  }
  for (const e of model.edges) g.setEdge(e.from, e.to);
  dagre.layout(g);

  // dagre orders rows to limit crossings; x comes from the step so the drawn
  // column matches the step badge. Rows are re-packed to avoid overlaps.
  const columns = new Map<number, Array<{ id: string; y: number }>>();
  for (const n of model.nodes) {
    const column = columns.get(n.step) ?? [];
    column.push({ id: n.id, y: g.node(n.id)?.y ?? 0 });
    columns.set(n.step, column);
  }
  const layout: TaskGraphLayout = new Map();
  for (const [step, column] of columns) {
    column.sort((a, b) => a.y - b.y);
    let nextFree = -Infinity;
    for (const { id, y } of column) {
      const top = Math.max(y - TASK_GRAPH_NODE_HEIGHT / 2, nextFree);
      nextFree = top + TASK_GRAPH_NODE_HEIGHT + ROW_GAP;
      layout.set(id, {
        x: (step - 1) * (TASK_GRAPH_NODE_WIDTH + COLUMN_GAP),
        y: top,
        width: TASK_GRAPH_NODE_WIDTH,
        height: TASK_GRAPH_NODE_HEIGHT,
      });
    }
  }
  return layout;
}
