import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/components/state-provider", () => ({
  useAppStore: (sel: (s: unknown) => unknown) => sel({ kanban: { tasks: [] } }),
}));
vi.mock("./task-graph-canvas", () => ({
  TaskGraphCanvas: (p: {
    model: { nodes: Array<{ id: string; title: string }> };
    selectedId: string | null;
    onActivate: (id: string) => void;
    onOpen?: (id: string) => void;
  }) => (
    <div>
      {p.model.nodes.map((n) => (
        <button
          key={n.id}
          type="button"
          data-selected={p.selectedId === n.id}
          onClick={() => p.onActivate(n.id)}
          onDoubleClick={() => p.onOpen?.(n.id)}
        >
          {n.title}
        </button>
      ))}
    </div>
  ),
}));

import { BoardGraph } from "./board-graph";

beforeAll(() => {
  Element.prototype.scrollIntoView ??= () => {};
});
afterEach(cleanup);

const tasks = [
  { id: "a", title: "Alpha" },
  { id: "b", title: "Beta", dependsOn: [{ id: "a" }] },
];

describe("BoardGraph", () => {
  it("selects on click, then opens or previews the selected task", () => {
    const onOpen = vi.fn();
    const onPreview = vi.fn();
    render(<BoardGraph tasks={tasks} focusId={null} onOpen={onOpen} onPreview={onPreview} />);
    expect(screen.getByText("Select a task to open it, or double-click it.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByTestId("board-graph-selection").textContent).toContain("Beta");

    fireEvent.click(screen.getByTestId("board-graph-preview"));
    expect(onPreview).toHaveBeenCalledWith("b");
    fireEvent.click(screen.getByTestId("board-graph-open"));
    expect(onOpen).toHaveBeenCalledWith("b");
  });

  it("opens on double-click and preselects the focused task", () => {
    const onOpen = vi.fn();
    render(<BoardGraph tasks={tasks} focusId="a" onOpen={onOpen} onPreview={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Alpha" }).dataset.selected).toBe("true");
    fireEvent.doubleClick(screen.getByRole("button", { name: "Beta" }));
    expect(onOpen).toHaveBeenCalledWith("b");
  });
});
