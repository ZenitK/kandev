import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { Button } from "@kandev/ui/button";
import { Spinner } from "@kandev/ui/spinner";
import { useTheme } from "@/components/theme/app-theme";
import { useTaskGraph } from "@/hooks/domains/task/use-task-graph";
import { useTouchDrawer } from "@/hooks/use-compact-task-chrome";
import { linkToTask } from "@/lib/links";
import { useRouter } from "@/lib/routing/client-router";
import { layoutTaskGraph } from "@/lib/task-graph/layout";
import { traceChain, type TaskGraphModel, type TaskGraphNode } from "@/lib/task-graph/model";
import { formatTaskStateLabel } from "@/lib/ui/state-labels";
import type { TaskState } from "@/lib/types/http";
import { TaskGraphLegend } from "./task-graph-legend";
import { TaskGraphModeSelector } from "./task-graph-mode-selector";
import { TaskGraphNodeCard } from "./task-graph-node-card";
import { XyflowTaskGraphRenderer } from "./xyflow-task-graph-renderer";

function Notice({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <IconInfoCircle aria-hidden="true" className="size-3.5 shrink-0" />
      {children}
    </p>
  );
}

function GraphNotices({ model }: { model: TaskGraphModel }) {
  const { t } = useTranslation();
  const lonely = model.mode === "chain" && model.edges.length === 0;
  return (
    <>
      {model.truncated && (
        <Notice>{t("task:taskGraphTruncated", { count: model.nodes.length })}</Notice>
      )}
      {model.noOrderSet && <Notice>{t("task:taskGraphNoOrder")}</Notice>}
      {lonely && <Notice>{t("task:taskGraphNoDependencies")}</Notice>}
    </>
  );
}

function StatusArea({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-2 text-sm">
        <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <IconAlertTriangle aria-hidden="true" className="size-4" />
          {t("task:taskGraphError")}
        </span>
        <Button variant="outline" size="sm" className="cursor-pointer" onClick={onRetry}>
          {t("task:taskGraphRetry")}
        </Button>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner aria-hidden="true" />
      {t("task:taskGraphLoading")}
    </div>
  );
}

function GraphCanvas({
  model,
  onActivate,
}: {
  model: TaskGraphModel;
  onActivate: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const touch = useTouchDrawer();
  const [emphasized, setEmphasized] = useState<string | null>(null);
  const layout = useMemo(() => layoutTaskGraph(model), [model]);
  const emphasis = useMemo(
    () => (emphasized && model.predecessors.has(emphasized) ? traceChain(model, emphasized) : null),
    [model, emphasized],
  );
  const nodeLabel = useCallback(
    (node: TaskGraphNode) =>
      t("task:taskGraphNodeLabel", {
        title: node.title,
        state: formatTaskStateLabel(node.state as TaskState),
        step: node.step,
      }),
    [t],
  );
  return (
    <XyflowTaskGraphRenderer
      model={model}
      layout={layout}
      emphasis={emphasis}
      colorMode={resolvedTheme}
      touch={touch}
      renderNode={(node, state) => <TaskGraphNodeCard node={node} state={state} />}
      nodeLabel={nodeLabel}
      onNodeActivate={onActivate}
      onNodeEmphasize={setEmphasized}
    />
  );
}

/** Dialog body: lazy-loaded so the graph libraries stay out of task detail. */
export function TaskGraphContent({
  taskId,
  onNavigate,
  keepGraphOpen = false,
}: {
  taskId: string;
  /** Re-open the graph on the destination task (workbench tab). */
  keepGraphOpen?: boolean;
  onNavigate: () => void;
}) {
  const { model, loading, error, setMode, retry } = useTaskGraph(taskId, true);
  const router = useRouter();
  const activate = useCallback(
    (id: string) => {
      onNavigate();
      router.push(linkToTask(id, keepGraphOpen ? { panel: "task-graph" } : undefined));
    },
    [onNavigate, router, keepGraphOpen],
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {model?.root && (
          <span className="min-w-0 truncate text-sm font-medium" data-testid="task-graph-root">
            {model.root.title}
          </span>
        )}
        {model && (
          <TaskGraphModeSelector
            mode={model.mode}
            available={model.availableModes}
            disabled={loading}
            onChange={setMode}
          />
        )}
      </div>
      {model && <GraphNotices model={model} />}
      <div
        data-testid="task-graph-canvas"
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border"
      >
        {model ? (
          <GraphCanvas model={model} onActivate={activate} />
        ) : (
          <StatusArea error={error} onRetry={retry} />
        )}
      </div>
      <TaskGraphLegend showExternal={model?.nodes.some((n) => n.role === "external") ?? false} />
    </div>
  );
}
