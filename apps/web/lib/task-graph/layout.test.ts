import { describe, expect, it } from "vitest";
import type { TaskGraphResponse } from "@/lib/api/domains/task-graph-api";
import { buildTaskGraphModel } from "./model";
import { TASK_GRAPH_NODE_HEIGHT, TASK_GRAPH_NODE_WIDTH, layoutTaskGraph } from "./layout";

function model(ids: string[], edges: Array<[string, string]>) {
  const response: TaskGraphResponse = {
    mode: "chain",
    available_modes: ["chain"],
    focus_task_id: ids[0],
    nodes: ids.map((id) => ({
      id,
      title: id,
      state: "TODO",
      depth: 0,
      role: "member",
      archived: false,
      blocked: false,
    })),
    edges: edges.map(([from, to]) => ({ from, to, status: "pending" })),
    truncated: false,
  };
  return buildTaskGraphModel(response);
}

describe("layoutTaskGraph", () => {
  it("positions every node with the shared card size", () => {
    const layout = layoutTaskGraph(model(["a", "b"], [["a", "b"]]));
    for (const id of ["a", "b"]) {
      expect(layout.get(id)).toMatchObject({
        width: TASK_GRAPH_NODE_WIDTH,
        height: TASK_GRAPH_NODE_HEIGHT,
      });
    }
  });

  it("puts each step in its own column, left to right", () => {
    // s has a single far successor; dagre alone may pull it rightwards.
    const m = model(
      ["a", "b", "c", "s"],
      [
        ["a", "b"],
        ["b", "c"],
        ["s", "c"],
      ],
    );
    const layout = layoutTaskGraph(m);
    const x = (id: string) => layout.get(id)?.x ?? NaN;
    expect(x("a")).toBe(x("s"));
    expect(x("a")).toBeLessThan(x("b"));
    expect(x("b")).toBeLessThan(x("c"));
  });

  it("does not overlap nodes in the same column", () => {
    const layout = layoutTaskGraph(model(["a", "b", "c"], []));
    const ys = ["a", "b", "c"].map((id) => layout.get(id)?.y ?? 0).sort((p, q) => p - q);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(TASK_GRAPH_NODE_HEIGHT);
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(TASK_GRAPH_NODE_HEIGHT);
  });
});
