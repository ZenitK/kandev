---
status: current
system: tasks
requirements:
  - REQ-TASKS-TASK-RELATIONSHIP-GRAPH-001
  - REQ-TASKS-TASK-RELATIONSHIP-GRAPH-002
  - REQ-TASKS-TASK-RELATIONSHIP-GRAPH-003
  - REQ-TASKS-TASK-RELATIONSHIP-GRAPH-004
  - REQ-TASKS-TASK-RELATIONSHIP-GRAPH-005
  - REQ-TASKS-TASK-RELATIONSHIP-GRAPH-006
  - REQ-TASKS-TASK-RELATIONSHIP-GRAPH-007
  - REQ-TASKS-TASK-RELATIONSHIP-GRAPH-008
  - REQ-TASKS-TASK-RELATIONSHIP-GRAPH-009
created: 2026-10-17
owners:
  - kandev
---

# Task relationship graph System Design

## Purpose and boundaries

This design adds a read-only graph read to the task service and a graph dialog
to the web task-detail surface. It reuses the dependency edges in
`task_blockers` and the subtask hierarchy in `tasks.parent_id`. It does not
change edge storage, validation, cycle checks, launch gating, or events defined
in [`task-dependencies.md`](task-dependencies.md).

The task system owns this design because it owns both relationships. The
graph is the shipped answer to the "whole-graph view" exclusion in
[`task-dependencies.md`](task-dependencies.md#out-of-scope): it draws real
connectors and focuses one subtree or one chain.

Renderer isolation follows
[ADR-2026-10-17 task graph renderer boundary](../../../decisions/2026-10-17-task-graph-renderer-boundary.md).

## Requirement mapping

| Requirement | Design section |
| --- | --- |
| `REQ-TASKS-TASK-RELATIONSHIP-GRAPH-001` | [Entry points](#entry-points), [Dialog](#dialog) |
| `REQ-TASKS-TASK-RELATIONSHIP-GRAPH-002` | [Graph read contract](#graph-read-contract), [Subtasks traversal](#subtasks-traversal), [Graph model](#graph-model) |
| `REQ-TASKS-TASK-RELATIONSHIP-GRAPH-003` | [Graph read contract](#graph-read-contract), [Chain traversal](#chain-traversal), [Graph model](#graph-model) |
| `REQ-TASKS-TASK-RELATIONSHIP-GRAPH-004` | [Mode selection](#mode-selection), [Dialog](#dialog) |
| `REQ-TASKS-TASK-RELATIONSHIP-GRAPH-005` | [Node and edge presentation](#node-and-edge-presentation), [Live refresh](#live-refresh) |
| `REQ-TASKS-TASK-RELATIONSHIP-GRAPH-006` | [Renderer boundary](#renderer-boundary), [Interaction](#interaction) |
| `REQ-TASKS-TASK-RELATIONSHIP-GRAPH-007` | [Bounds and failure](#bounds-and-failure) |
| `REQ-TASKS-TASK-RELATIONSHIP-GRAPH-008` | [Responsive behavior](#responsive-behavior) |
| `REQ-TASKS-TASK-RELATIONSHIP-GRAPH-009` | [Workbench tab](#workbench-tab), [Show in graph](#show-in-graph) |

## Graph read contract

`GET /api/v1/tasks/:id/graph?mode=subtasks|chain` is registered with the other
task routes in `internal/task/handlers/task_handlers.go`. It is a read with the
same authorization and not-found handling as `GET /api/v1/tasks/:id`. No
WebSocket action, MCP tool, migration, or event is added.

`mode` is optional. When it is omitted, the server selects the default by the
rule in [Mode selection](#mode-selection). A requested mode that is not
available returns HTTP `400` with `{ "error": "...", "code": "graph_mode_unavailable" }`.

Response (`dto.TaskGraphDTO` in `internal/task/dto/task_graph.go`):

```json
{
  "mode": "subtasks",
  "available_modes": ["subtasks", "chain"],
  "focus_task_id": "task-b",
  "root": { "id": "task-parent", "title": "Ship billing" },
  "nodes": [
    {
      "id": "task-b",
      "title": "Write API",
      "state": "IN_PROGRESS",
      "parent_id": "task-parent",
      "parent_title": "Ship billing",
      "depth": 1,
      "role": "member",
      "archived": false,
      "blocked": false,
      "blocked_reason": ""
    }
  ],
  "edges": [
    { "from": "task-a", "to": "task-b", "status": "resolved" }
  ],
  "truncated": false
}
```

- `root` is present only in `subtasks` mode. The root is not a node; it is the
  header subject.
- `role` is `member` or `external`. The focused node is identified by
  `focus_task_id`, never by role, so a focused node keeps its membership.
- `depth` is the `parent_id` distance from the root, starting at 1. It is `0`
  for external nodes and for every node in `chain` mode.
- An edge points from predecessor to dependent. `status` uses the existing edge
  verdicts `resolved`, `failed`, and `pending` from
  `internal/task/service/service_dependencies.go`.
- `blocked` and `blocked_reason` come from `BuildDependencyViews`, so node
  blockage matches the board and the dependency chip.
- `nodes` are ordered by first discovery. Edges are deduplicated by
  `(from, to)`.

## Mode selection

`available_modes` always contains `chain`. It contains `subtasks` when the
opened task has a non-archived, non-ephemeral child or a non-empty
`parent_id`. The default mode is `subtasks` when available and `chain`
otherwise.

## Subtasks traversal

`Service.BuildTaskGraph` in `internal/task/service/service_task_graph.go`:

1. Selects the root: the opened task when `ListChildrenLimited` returns a
   child, otherwise the opened task's parent.
2. Walks descendants breadth-first, one `ListChildrenLimited` call per parent,
   using the same non-archived, non-ephemeral filter as `ListChildren`. The
   remaining node budget is the limit for each call. A visited set guards
   against corrupt hierarchy loops.
3. Reads the edges of all members in one batch with `ListBlockersForTasks` and
   `ListDependentsForTasks`.
4. Adds each edge end that is not a member as an `external` node, without
   following its other edges. This can include the root itself.
5. Resolves external rows with `GetTasksByIDs` and computes every node's
   `DependencyView` with `BuildDependencyViews`.

## Chain traversal

The chain walk is two independent breadth-first searches from the focus task.
The upstream search follows `ListBlockersForTasks` one level per batch. The
downstream search follows `ListDependentsForTasks` one level per batch. The
walk never follows an edge in the opposite direction, so a sibling predecessor
of a dependent is excluded. Archived tasks remain nodes with `archived: true`.
The result contains every edge between two displayed nodes, including an edge
between two upstream nodes.

Edges are acyclic because writes reject cycles. Visited sets still bound the
walk if a corrupt row forms a loop.

## Bounds and failure

- `maxTaskGraphNodes = 200` counts every node, including external nodes and the
  focus. The walk stops adding nodes when the budget is reached, sets
  `truncated: true`, and returns only edges between returned nodes.
- Each traversal level is one batched repository read, so a 200-node graph
  costs at most a few hundred bounded queries in the deepest case and a
  handful in the common case.
- A repository error returns HTTP `500` without a partial graph. A missing or
  unauthorized task returns the existing task not-found response.
- When no blocker repository is wired, the read returns nodes without edges
  and the withheld dependency views that `BuildDependencyViews` already
  produces.

## Frontend structure

```text
lib/api/domains/task-graph-api.ts        fetch + response types
lib/task-graph/model.ts                  renderer-agnostic model: steps, chains
lib/task-graph/layout.ts                 dagre layout → node positions
components/task-graph/
  task-graph-button.tsx                  status-row entry control
  task-graph-dialog.tsx                  Dialog / phone sheet shell (lazy body)
  task-graph-content.tsx                 states, notices, canvas, navigation
  task-graph-mode-selector.tsx           Subtasks / Chain toggle
  task-graph-legend.tsx                  edge-style legend
  task-graph-edge-styles.ts              stroke, dash, width per verdict
  task-graph-node-card.tsx               renderer-agnostic node card
  use-node-press.ts                      tap vs. touch long press
  xyflow-task-graph-renderer.tsx         only importer of @xyflow/react
  task-graph-renderer.ts                 TaskGraphRendererProps contract
hooks/domains/task/use-task-graph.ts           fetch, refresh, retry
hooks/domains/task/use-task-graph-available.ts entry-point visibility
hooks/domains/task/use-task-dependencies.ts    dependency projection (moved from the chip)
```

`@xyflow/react` and `@dagrejs/dagre` are new `apps/web` dependencies.
`task-graph-dialog.tsx` loads `task-graph-content.tsx` with `React.lazy`, so
neither library enters the task-detail bundle until the dialog opens.

## Graph model

`buildTaskGraphModel(response)` in `lib/task-graph/model.ts` is a pure
function. It returns the nodes with a `step` number, the edges, the focus ID,
and adjacency maps. The step number is the longest-path rank over displayed
edges: a node without a displayed predecessor has step 1, and every other node
has `1 + max(step of displayed predecessors)`. The computation is a Kahn
topological pass. A node left in a cycle receives the highest assigned step
plus one, so corrupt data cannot hang the dialog.

`traceChain(model, nodeId)` returns the transitive predecessor and dependent
node IDs and the edge IDs between them. It powers emphasis
(AC-TASKS-TASK-RELATIONSHIP-GRAPH-006.2) and is independent of the renderer.

`noOrderSet` is true in `subtasks` mode when no member has a displayed edge to
another member (AC-TASKS-TASK-RELATIONSHIP-GRAPH-002.7).

## Renderer boundary

`TaskGraphRendererProps` in `components/task-graph/task-graph-renderer.ts` is
the only contract between the dialog and a renderer:

```ts
type TaskGraphRendererProps = {
  model: TaskGraphModel;
  layout: TaskGraphLayout;            // node id -> { x, y, width, height }
  emphasis: TaskGraphChain | null;    // from traceChain
  colorMode: "light" | "dark";
  touch: boolean;                     // coarse pointer: no minimap, 44 px controls
  renderNode: (node: TaskGraphNode, state: TaskGraphNodeRenderState) => ReactNode;
  nodeLabel: (node: TaskGraphNode) => string; // accessible name
  onNodeActivate: (nodeId: string) => void;
  onNodeEmphasize: (nodeId: string | null) => void;
};
```

- `layoutTaskGraph(model)` in `lib/task-graph/layout.ts` is the only importer of
  `@dagrejs/dagre`. dagre (`rankdir: "LR"`) only orders nodes within a
  column to limit crossings; it takes no rank input, so x comes from the model
  step and each column is re-packed to avoid overlaps. The drawn column always
  equals the step badge.
- `xyflow-task-graph-renderer.tsx` is the only importer of `@xyflow/react`. It
  maps the model and layout into xyflow nodes and edges, uses one custom node
  type that calls `renderNode`, and uses the built-in smooth-step edge with a
  marker arrow. Nodes are not draggable or connectable, and edges are not
  selectable or deletable (AC-TASKS-TASK-RELATIONSHIP-GRAPH-006.5).
- `task-graph-node-card.tsx` is plain React with design tokens, so a
  replacement renderer reuses it unchanged.

A lint rule (`no-restricted-imports` in `apps/web/eslint.config.mjs`) rejects
`@xyflow/react` and `@dagrejs/dagre` outside their single owning file.

## Node and edge presentation

- A node card shows the step badge, title (two-line clamp), the existing task
  state indicator, a lock icon with "Blocked" or a warning icon with
  "Predecessor failed", and, for depth greater than 1, "in <parent title>".
- An `external` node uses a dashed border and muted fill. An `archived` node
  uses reduced opacity and an "Archived" label. The focused node uses a
  primary-color ring and a "This task" label.
- Edge styles: `resolved` is a solid muted line; `pending` is a dashed
  primary-color line; `failed` is a solid destructive-color line. The legend
  shows the three styles with text labels.
- Colors come from the app's CSS variables (`--border`, `--primary`,
  `--destructive`, `--muted-foreground`, `--card`). The renderer passes
  `colorMode` from `useTheme().resolvedTheme` to `ReactFlow` and overrides the
  xyflow CSS variables (`--xy-background-color`, `--xy-edge-stroke`,
  `--xy-controls-button-background-color`, and related) with those tokens.
  Theme changes re-render through `useTheme` without reopening the dialog
  (AC-TASKS-TASK-RELATIONSHIP-GRAPH-005.5).

## Entry points

`TaskGraphButton` is a labelled "Task graph" pill styled like the dependency chip. It is mounted next to
`TaskDependencyChip` in `components/task/chat/chat-status-bar.tsx` and
`components/task/passthrough-toolbar.tsx`. It renders when the store task has
dependency refs, a `parentTaskId`, or a subtask from `useTaskSubtasks`. Only
when none of those is known does it read `GET /tasks/:id/subtask-count`, which
covers a parent whose subtasks are not on a loaded board.
`TaskDependencyChip` adds a "View graph" action to its popover and drawer that
opens the same dialog with the default mode.

## Mode selection in the UI

The dialog header uses the `@kandev/ui` toggle group with Subtasks and Chain
options. The first request omits `mode`; the response's `mode` and
`available_modes` initialize the selector. A disabled Subtasks option has a
tooltip, or helper text on touch, saying the task has no subtasks or parent.

## Dialog

`TaskGraphDialog` uses `@kandev/ui` `Dialog` on desktop at
`min(1200px, 95vw)` by `min(800px, 90vh)`. On phones it renders full screen,
following the existing full-screen task edit dialog pattern. Radix restores
focus only to a `DialogTrigger`, so `TaskGraphButton` passes its button as the
trigger and the dependency chip passes `returnFocusTo` with its own trigger
(AC-TASKS-TASK-RELATIONSHIP-GRAPH-001.5). The header contains the title and
close; the body shows the root name in Subtasks mode and the view selector. A footer row contains the legend. A truncation notice appears above the
canvas when `truncated` is true.

## Interaction

- Node activation navigates with the existing task route helper used by
  `TaskLink` and then closes the dialog.
- The custom node renders a focusable button with
  `aria-label` "<title>, <state>, step <n>". Tab order follows step, then
  discovery order, through xyflow's node keyboard support with `tabIndex`
  ordering.
- `onMouseEnter`, `onFocus`, `onMouseLeave`, and `onBlur` call
  `onNodeEmphasize`. Emphasized elements keep full opacity; others drop to
  reduced opacity.
- `fitView` runs on initial render and after a mode change, with a zoom floor
  of 0.75 so cards stay readable. A graph larger than the canvas at that floor
  is centred on the focused task when it is a node, and otherwise anchored at
  its top-left (step 1). The fit waits for the canvas size, not node
  measurement, because node sizes are explicit. The xyflow
  `Controls` provide zoom in, zoom out, and fit view.

## Live refresh

`useTaskGraph` refetches with a 500 ms trailing debounce when its store
signature changes. The signature is derived from store tasks whose ID is a
displayed node or whose `parentTaskId` is a displayed member or the root, and
includes each one's `state`, `title`, `parentTaskId`, `archivedAt`, `dependsOn`
IDs, and `blocks` IDs. Existing `task.updated`, `task.created`, and
`task.deleted` handling keeps the store current, so the graph does not add a
WebSocket subscription. A refetch keeps the previous graph visible and does not
reset the viewport unless the node set changes.

## Responsive behavior

- Phone: the full-screen sheet has the header and selector fixed at the top and
  the legend fixed at the bottom; the canvas fills the rest and owns all
  gestures. xyflow provides one-finger pan and pinch zoom. The minimap is not
  rendered on phones.
- Long press (500 ms without movement) on a node calls `onNodeEmphasize`;
  a tap activates the node (AC-TASKS-TASK-RELATIONSHIP-GRAPH-008.3).
- Touch controls use `min-h-11 min-w-11` targets. xyflow `Controls` buttons get
  the same size through the CSS variable override on coarse pointers.
- The sheet uses `overflow-hidden` with the canvas at `100%` width, so the
  document cannot scroll horizontally.

## Workbench tab

On desktop the graph is the `task-graph` dockview panel, a fixed-id panel
listed in `KNOWN_PANEL_IDS`, `RENDERABLE_COMPONENT_NAMES`, both
`PANEL_RENDERERS` tables, and `PANEL_REGISTRY` (`task:panelTaskGraph`), so the
layout serializer keeps it. `addTaskGraphPanel` in
`lib/state/dockview-extra-panel-actions.ts` opens it with `inCenter: true`
through `addSidePanel`, which focuses an existing tab. The panel carries no
params: `TaskGraphPanel` reads `tasks.activeTaskId`, so it follows task
switches and node activation (which only navigates). The dialog shell is now
the phone sheet only.

## Show in graph

`linkToTask(taskId, { panel: "task-graph" })` adds `?panel=task-graph`.
`TaskGraphPanelRequest`, mounted once in `TaskLayout`, reads the param; on
desktop it waits for the dockview `api` and `isRestoringLayout === false`, calls
`addTaskGraphPanel`, and on phones it opens the sheet. When the active session
has an environment, it also waits until `currentLayoutEnvId` equals that
environment, because applying an environment layout replaces the panels; a
session that still belongs to the previous task counts as not ready. A first
visit can create the environment after the request is fulfilled, so the
component re-adds the tab once when that environment's layout is adopted. It then replaces the URL
without the param so reloads and back navigation do not reopen it. The sidebar
context menu (`TaskShowInGraphItem` in the relationships group) and the Kanban
card menu (`buildShowGraphEntry`) push that link. The status-row button and
the chip action call the same open path for the current task.

## Localization

Copy uses flat `task:taskGraph*` keys in all seven catalogs plus the
pseudo-locale. The node accessible name interpolates `{{title}}`, `{{state}}`,
and `{{step}}`; the truncation notice uses `{{count}}` with `_one` and `_other`
forms. xyflow's built-in English aria labels are replaced through
`ariaLabelConfig`.

## Testing

- Go service tests: root selection, multi-level subtree, archived and ephemeral
  filtering, external nodes, chain direction rules, archived chain nodes,
  truncation, dedupe, and mode availability.
- Go handler tests: response shape, default mode, `graph_mode_unavailable`,
  not-found, and authorization.
- Vitest: API client, `buildTaskGraphModel` step numbers and cycle guard,
  `traceChain`, `layoutTaskGraph` rank equals step, `useTaskGraph` debounce and
  retry, button visibility, and the dialog's loading, error, empty, truncated,
  and disabled-mode states with a stub renderer.
- Playwright: desktop and mobile specs in `apps/web/e2e/tests/task/`.
