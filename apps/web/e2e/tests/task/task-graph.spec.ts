import { expect, test } from "../../fixtures/test-base";
import type { ApiClient } from "../../helpers/api-client";
import { waitForHttp } from "../../helpers/causal-waits";

// Task relationship graph (docs/specs/tasks/requirements/task-relationship-graph.md).
// Topology: outside → a → b → c, with sibling d unordered, all children of parent.

type Seed = { workspaceId: string; workflowId: string; startStepId: string; repositoryId: string };

async function seedGraph(apiClient: ApiClient, seed: Seed) {
  const base = {
    workflow_id: seed.workflowId,
    workflow_step_id: seed.startStepId,
    repository_ids: [seed.repositoryId],
  };
  const parent = await apiClient.createTask(seed.workspaceId, "Graph parent", base);
  const outside = await apiClient.createTask(seed.workspaceId, "Graph outside", base);
  const child = (title: string, blockedBy?: string) =>
    apiClient.createTask(seed.workspaceId, title, {
      ...base,
      parent_id: parent.id,
      ...(blockedBy ? { blocked_by: [blockedBy], start_when_unblocked: false } : {}),
    });
  const a = await child("Graph A", outside.id);
  const b = await child("Graph B", a.id);
  const c = await child("Graph C", b.id);
  const d = await child("Graph D");
  return { parent, outside, a, b, c, d };
}

const node = (page: import("@playwright/test").Page, id: string) =>
  page.getByTestId(`task-graph-node-${id}`);

test.describe("Task graph", () => {
  test("shows subtasks in order, follows live state and navigates", async ({
    testPage,
    apiClient,
    seedData,
  }) => {
    const g = await seedGraph(apiClient, seedData);
    await testPage.goto(`/t/${g.b.id}`);

    const button = testPage.getByTestId("task-graph-button").first();
    await button.click();
    const dialog = testPage.getByTestId("task-graph-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("task-graph-root")).toHaveText(g.parent.title);
    await expect(dialog.getByTestId("task-graph-mode-subtasks")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await expect(node(testPage, g.outside.id)).toHaveAccessibleName(/step 1$/);
    await expect(node(testPage, g.a.id)).toHaveAccessibleName(/^Graph A, .*, step 2$/);
    await expect(node(testPage, g.b.id)).toHaveAccessibleName(/step 3$/);
    await expect(node(testPage, g.c.id)).toHaveAccessibleName(/step 4$/);
    await expect(node(testPage, g.d.id)).toHaveAccessibleName(/step 1$/);
    await expect(dialog.getByText("Outside this task")).toBeVisible();
    await expect(dialog.getByText("This task", { exact: true })).toBeVisible();
    await expect(dialog.getByTestId("task-graph-legend")).toContainText("Waiting");

    // Hovering A emphasizes its chain and dims the unrelated sibling.
    await node(testPage, g.a.id).hover();
    const dCard = node(testPage, g.d.id).getByTestId("task-graph-node-card");
    await expect(dCard).toHaveAttribute("data-dimmed", "true");
    await expect(node(testPage, g.c.id).getByTestId("task-graph-node-card")).toHaveAttribute(
      "data-emphasized",
      "true",
    );

    // A state change reaches the open graph without reopening it.
    const refetch = waitForHttp(testPage, "GET", new RegExp(`/tasks/${g.b.id}/graph$`));
    await apiClient.updateTaskState(g.a.id, "COMPLETED");
    await refetch;
    await expect(node(testPage, g.a.id)).toHaveAccessibleName(/Completed/);

    await dialog.getByTestId("task-graph-mode-chain").click();
    await expect(node(testPage, g.d.id)).toHaveCount(0);
    await expect(node(testPage, g.c.id)).toBeVisible();

    await node(testPage, g.c.id).click();
    await expect(testPage).toHaveURL(new RegExp(`/t/${g.c.id}$`));
    await expect(dialog).toHaveCount(0);
  });

  test("opens from the dependency chip, closes on Escape and follows dark mode", async ({
    testPage,
    apiClient,
    seedData,
  }) => {
    const g = await seedGraph(apiClient, seedData);
    await testPage.emulateMedia({ colorScheme: "dark" });
    await testPage.goto(`/t/${g.b.id}`);

    await testPage.getByTestId("task-dependency-chip").first().click();
    await testPage.getByTestId("task-dependency-view-graph").click();
    const dialog = testPage.getByTestId("task-graph-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".react-flow.dark")).toHaveCount(1);
    await testPage.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    const button = testPage.getByTestId("task-graph-button").first();
    await button.click();
    await expect(dialog).toBeVisible();
    await testPage.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test("hides the entry point for a task without relations", async ({
    testPage,
    apiClient,
    seedData,
  }) => {
    const lonely = await apiClient.createTask(seedData.workspaceId, "Graph lonely", {
      workflow_id: seedData.workflowId,
      workflow_step_id: seedData.startStepId,
      repository_ids: [seedData.repositoryId],
    });
    const subtaskCount = waitForHttp(
      testPage,
      "GET",
      new RegExp(`/tasks/${lonely.id}/subtask-count$`),
    );
    await testPage.goto(`/t/${lonely.id}`);
    await subtaskCount;
    await expect(testPage.getByTestId("task-graph-button")).toHaveCount(0);
  });
});
