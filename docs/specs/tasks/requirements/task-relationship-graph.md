---
status: active
system: tasks
created: 2026-10-17
owners:
  - kandev
---

# Task relationship graph Requirements

## Overview

Users split work into subtasks and order them with dependency edges. Kandev
shows those relationships one hop at a time: the dependency chip, the task
context panel, and the subtask list. A user cannot see the whole order of a
parent's subtasks or the full chain around one task.

The task relationship graph is a read-only diagram. It shows tasks as nodes and
dependency edges as drawn connectors, so the user can read which work runs
first, which work can run in parallel, and what is waiting.

## Terminology

- **Predecessor:** A task that must complete successfully before its dependent
  task is unblocked. See [`task-dependencies.md`](task-dependencies.md).
- **Subtree:** All non-archived descendants of one task through `parent_id`.
- **Subtasks view:** The graph of one task's subtree.
- **Chain view:** The graph of one task, its transitive predecessors, and its
  transitive dependents.
- **Step number:** The 1-based position of a node in the dependency order. A
  node with no displayed predecessor has step 1. Every other node has a step one
  greater than its highest displayed predecessor.
- **External node:** A task outside the subtree that has a dependency edge to or
  from a subtree member.

## Requirements

### REQ-TASKS-TASK-RELATIONSHIP-GRAPH-001: Open the task graph

**Intent:** Make the graph reachable from the task the user is working in.

**User story:** As a developer, I want to open a graph from a task, so that I
can see how its related cards are ordered without opening each card.

#### Acceptance criteria

- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-001.1:** When a task has at least one
  dependency edge, a parent, or a non-archived subtask, the task-detail status
  row shall show a Task graph control.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-001.2:** When a task has no dependency
  edge, no parent, and no non-archived subtask, the system shall not show the
  Task graph control.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-001.3:** The control shall open the graph
  in a dialog on desktop and in a full-screen sheet on phones.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-001.4:** The dependency chip shall show
  an action that opens the same graph.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-001.5:** The dialog shall close through
  its close control and the Escape key. Closing shall return focus to the
  control that opened it.

### REQ-TASKS-TASK-RELATIONSHIP-GRAPH-002: Show a parent's subtasks in order

**Intent:** Show the execution order of all cards that belong to one task.

#### Acceptance criteria

- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-002.1:** When the opened task has a
  non-archived subtask, the Subtasks view shall show the opened task's subtree.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-002.2:** When the opened task has no
  non-archived subtask and has a parent, the Subtasks view shall show the
  parent's subtree and mark the opened task as the focused node.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-002.3:** The view shall show every
  non-archived descendant at every depth. A node deeper than a direct child
  shall name its parent task.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-002.4:** The view shall draw each
  dependency edge between two subtree members as a directed connector from the
  predecessor to the dependent.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-002.5:** The view shall show each
  external predecessor or dependent of a subtree member as a visually distinct
  external node, connected by its edge. It shall not expand the external node's
  other edges.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-002.6:** Each node shall show its step
  number. Nodes with the same step number shall be laid out in the same rank.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-002.7:** When no subtree member has a
  dependency edge, the view shall place every member at step 1 and state that
  the subtasks have no set order.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-002.8:** The view header shall name the
  subtree's root task.

### REQ-TASKS-TASK-RELATIONSHIP-GRAPH-003: Show a task's dependency chain

**Intent:** Show everything one task waits for and everything that waits for it.

#### Acceptance criteria

- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-003.1:** The Chain view shall show the
  opened task as the focused node, every transitive predecessor, and every
  transitive dependent, in any workflow of the task's workspace.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-003.2:** The Chain view shall not include
  a task that is neither a transitive predecessor nor a transitive dependent of
  the focused task.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-003.3:** The Chain view shall draw every
  dependency edge between two displayed tasks and shall show step numbers by
  the rule in AC-TASKS-TASK-RELATIONSHIP-GRAPH-002.6.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-003.4:** An archived predecessor or
  dependent shall appear as an archived node, not be omitted.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-003.5:** When the focused task has no
  dependency edge, the Chain view shall show only the focused node and state
  that the task has no dependencies.

### REQ-TASKS-TASK-RELATIONSHIP-GRAPH-004: Choose the graph view

**Intent:** Let one dialog answer both "how are these subtasks ordered" and
"what is this task waiting on".

#### Acceptance criteria

- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-004.1:** The dialog shall offer a
  Subtasks and Chain view selector.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-004.2:** The dialog shall open on the
  Subtasks view when it is available and on the Chain view otherwise.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-004.3:** When the opened task has no
  non-archived subtask and no parent, the Subtasks option shall be disabled and
  shall state why.

### REQ-TASKS-TASK-RELATIONSHIP-GRAPH-005: Read node and edge state

**Intent:** Let the user see progress and blockage from the graph alone.

#### Acceptance criteria

- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-005.1:** Each node shall show the task
  title, its task state, and whether it is blocked by a pending or failed
  predecessor.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-005.2:** Each connector shall
  distinguish resolved, pending, and failed edges by line style and color, and
  the dialog shall show a legend for those three styles.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-005.3:** The focused node shall be
  visually distinct from other nodes.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-005.4:** State meaning shall not depend
  on color alone: each state and edge style shall also have a text label,
  icon, or line pattern.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-005.5:** Nodes, connectors, legend, and
  canvas shall be readable in the light and dark themes and shall follow a
  theme change while the dialog is open.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-005.6:** While the dialog is open, a
  change to a displayed task's state, title, or dependency edges, or a new
  subtask in the displayed subtree, shall appear without reopening the dialog.

### REQ-TASKS-TASK-RELATIONSHIP-GRAPH-006: Navigate and explore the graph

**Intent:** Use the graph as a map to related cards.

#### Acceptance criteria

- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-006.1:** Activating a node by click,
  tap, Enter, or Space shall close the dialog and open that task.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-006.2:** When a pointer hovers a node or
  keyboard focus enters it, the graph shall emphasize the node's transitive
  predecessors, transitive dependents, and their connectors, and de-emphasize
  the rest.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-006.3:** The graph shall fit all nodes in
  the viewport when it opens and shall support pan, zoom, and a fit-view
  control.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-006.4:** Each node shall be reachable by
  keyboard in step order, and its accessible name shall include its title,
  state, and step number.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-006.5:** The graph shall not offer any
  control that adds, removes, or changes a dependency edge or a parent.

### REQ-TASKS-TASK-RELATIONSHIP-GRAPH-007: Bounded, recoverable graph reads

**Intent:** Keep large graphs usable and failures understandable.

#### Acceptance criteria

- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-007.1:** A graph read shall return at
  most 200 nodes. When it reaches that limit, the dialog shall state that the
  graph is truncated.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-007.2:** A graph read shall use the same
  workspace authorization as reading the opened task and shall return only tasks
  from that task's workspace.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-007.3:** While the graph loads, the
  dialog shall show a loading state. When the read fails, the dialog shall show
  an error with a Retry action.

### REQ-TASKS-TASK-RELATIONSHIP-GRAPH-008: Touch and phone parity

**Intent:** Give phone users the same graph value through native touch
interaction.

#### Acceptance criteria

- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-008.1:** On touch devices the graph shall
  support one-finger pan and pinch zoom, and a tap on a node shall open the task.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-008.2:** On touch devices, the view
  selector, fit-view, zoom, and close controls shall have a target of at least
  44 CSS pixels in the active dimension.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-008.3:** On touch devices, a long press
  on a node shall apply the chain emphasis from
  AC-TASKS-TASK-RELATIONSHIP-GRAPH-006.2 without opening the task.
- **AC-TASKS-TASK-RELATIONSHIP-GRAPH-008.4:** The phone sheet shall not add
  document-level horizontal overflow.

## Out of scope

- Creating, removing, or editing dependency edges or parents in the graph. The
  Edit task dialog remains the editor.
- A whole-workspace or whole-board graph.
- Cross-workspace edges, which the dependency system does not allow.
- Office task pages and the Office blocker picker.
- Persisting node positions, zoom, or the selected view.
- Exporting the graph as an image.
