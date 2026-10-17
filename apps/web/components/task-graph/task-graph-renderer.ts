import type { ReactNode } from "react";
import type { TaskGraphLayout } from "@/lib/task-graph/layout";
import type { TaskGraphChain, TaskGraphModel, TaskGraphNode } from "@/lib/task-graph/model";

// The only contract between the graph dialog and a renderer
// (ADR 2026-10-17-task-graph-renderer-boundary).

export type TaskGraphNodeRenderState = { dimmed: boolean; emphasized: boolean };

export type TaskGraphRendererProps = {
  model: TaskGraphModel;
  layout: TaskGraphLayout;
  emphasis: TaskGraphChain | null;
  colorMode: "light" | "dark";
  /** Hides the minimap and enlarges controls for touch. */
  touch: boolean;
  renderNode: (node: TaskGraphNode, state: TaskGraphNodeRenderState) => ReactNode;
  /** Accessible name of a node's activation control. */
  nodeLabel: (node: TaskGraphNode) => string;
  onNodeActivate: (nodeId: string) => void;
  onNodeEmphasize: (nodeId: string | null) => void;
};

export function nodeRenderState(
  emphasis: TaskGraphChain | null,
  nodeId: string,
): TaskGraphNodeRenderState {
  if (!emphasis) return { dimmed: false, emphasized: false };
  const emphasized = emphasis.nodeIds.has(nodeId);
  return { dimmed: !emphasized, emphasized };
}
