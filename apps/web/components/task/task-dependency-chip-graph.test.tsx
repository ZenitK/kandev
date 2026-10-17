import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StateProvider } from "@/components/state-provider";
import type { KanbanState } from "@/lib/state/slices/kanban/types";

const touch = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/use-compact-task-chrome", () => ({ useTouchDrawer: () => touch.value }));
vi.mock("@/components/task-graph/task-graph-content", () => ({
  TaskGraphContent: ({ taskId }: { taskId: string }) => (
    <div data-testid="graph-body">{taskId}</div>
  ),
}));

import { TaskDependencyChip } from "./task-dependency-chip";

afterEach(cleanup);

const tasks = [
  {
    id: "b",
    workflowStepId: "s",
    title: "B",
    position: 0,
    dependsOn: [{ id: "a", title: "A", status: "pending" }],
    blocks: [],
  },
] as unknown as KanbanState["tasks"];

function renderChip() {
  return render(
    <StateProvider initialState={{ kanban: { workflowId: "wf", steps: [], tasks } } as never}>
      <TaskDependencyChip taskId="b" />
    </StateProvider>,
  );
}

describe("TaskDependencyChip graph action", () => {
  it.each([false, true])("opens the task graph from the disclosure (touch=%s)", async (isTouch) => {
    touch.value = isTouch;
    renderChip();
    fireEvent.click(screen.getByTestId("task-dependency-chip"));
    fireEvent.click(await screen.findByRole("button", { name: "View graph" }));
    expect(await screen.findByTestId("graph-body")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Task graph" })).toBeTruthy();
  });
});
