import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@kandev/ui/tooltip";

const available = vi.hoisted(() => ({ value: true }));
vi.mock("@/hooks/domains/task/use-task-graph-available", () => ({
  useTaskGraphAvailable: () => available.value,
}));
vi.mock("./task-graph-content", () => ({
  TaskGraphContent: ({ taskId }: { taskId: string }) => (
    <div data-testid="graph-body">{taskId}</div>
  ),
}));

import { TaskGraphButton } from "./task-graph-button";

afterEach(cleanup);

function renderButton(taskId: string | null) {
  return render(
    <TooltipProvider>
      <TaskGraphButton taskId={taskId} />
    </TooltipProvider>,
  );
}

describe("TaskGraphButton", () => {
  it("renders nothing without relations", () => {
    available.value = false;
    renderButton("t1");
    expect(screen.queryByTestId("task-graph-button")).toBeNull();
  });

  it("opens the dialog with the lazy body, closes on Escape and restores focus", async () => {
    available.value = true;
    renderButton("t1");
    const button = screen.getByRole("button", { name: "Task graph" });
    button.focus();
    fireEvent.click(button);
    expect(await screen.findByTestId("graph-body")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Task graph" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(button));
  });
});
