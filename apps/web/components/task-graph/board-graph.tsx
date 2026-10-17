import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@kandev/ui/button";
import { useAppStore } from "@/components/state-provider";
import { buildBoardGraph, type BoardGraphTask } from "@/lib/task-graph/board";
import { layoutGroupedTaskGraph } from "@/lib/task-graph/layout";
import { buildTaskGraphModel } from "@/lib/task-graph/model";
import { TaskGraphCanvas } from "./task-graph-canvas";
import { TaskGraphLegend } from "./task-graph-legend";

const MIN_HEIGHT_PX = 260;
const MAX_HEIGHT_PX = 720;
const CHROME_PX = 48;

type TitleLookupState = {
  kanban?: { tasks?: Array<{ id: string; title: string }> };
  kanbanMulti?: { snapshots?: Record<string, { tasks?: Array<{ id: string; title: string }> }> };
};

function findTitle(state: TitleLookupState, id: string): string | undefined {
  const hit = state.kanban?.tasks?.find((t) => t.id === id);
  if (hit) return hit.title;
  for (const snapshot of Object.values(state.kanbanMulti?.snapshots ?? {})) {
    const found = snapshot.tasks?.find((t) => t.id === id);
    if (found) return found.title;
  }
  return undefined;
}

/** One workflow lane of the board Graph view: its filtered tasks, framed by parent. */
/** The selected task and its actions; a click on a node only selects it. */
function SelectionBar({
  title,
  onOpen,
  onPreview,
}: {
  title: string | null;
  onOpen: () => void;
  onPreview: () => void;
}) {
  const { t } = useTranslation();
  if (!title) {
    return <p className="text-xs text-muted-foreground">{t("task:taskGraphSelectHint")}</p>;
  }
  return (
    <div data-testid="board-graph-selection" className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 truncate text-sm font-medium">{title}</span>
      <Button
        size="sm"
        className="cursor-pointer [@media(pointer:coarse)]:min-h-11"
        data-testid="board-graph-open"
        onClick={onOpen}
      >
        {t("task:taskGraphOpenTask")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="cursor-pointer [@media(pointer:coarse)]:min-h-11"
        data-testid="board-graph-preview"
        onClick={onPreview}
      >
        {t("task:taskGraphPreviewTask")}
      </Button>
    </div>
  );
}

export function BoardGraph({
  tasks,
  focusId,
  onOpen,
  onPreview,
}: {
  tasks: BoardGraphTask[];
  focusId: string | null;
  onOpen: (taskId: string) => void;
  onPreview: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const store = useAppStore((state) => state as unknown as TitleLookupState);
  const graph = useMemo(() => {
    const { response, groups } = buildBoardGraph(tasks, focusId, (id) => findTitle(store, id));
    const model = buildTaskGraphModel(response);
    const placed = layoutGroupedTaskGraph(model, groups);
    const frames = groups.flatMap((group) => {
      const box = placed.groups.get(group.id);
      return box
        ? [{ id: group.id, title: group.title || t("task:taskGraphModeSubtasks"), box }]
        : [];
    });
    const boxes = [...placed.nodes.values(), ...placed.groups.values()];
    const height =
      Math.max(...boxes.map((b) => b.y + b.height)) - Math.min(...boxes.map((b) => b.y));
    return { model, layout: placed.nodes, frames, height };
  }, [tasks, focusId, store, t]);

  const [selectedId, setSelectedId] = useState<string | null>(focusId);
  useEffect(() => setSelectedId(focusId), [focusId]);
  const selected = tasks.find((task) => task.id === selectedId) ?? null;

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusId) containerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId]);

  const height = Math.min(MAX_HEIGHT_PX, Math.max(MIN_HEIGHT_PX, graph.height * 0.75 + CHROME_PX));
  return (
    <div ref={containerRef} data-testid="board-graph" className="flex flex-col gap-2 px-2 pb-2">
      <SelectionBar
        title={selected?.title ?? null}
        onOpen={() => selected && onOpen(selected.id)}
        onPreview={() => selected && onPreview(selected.id)}
      />
      <div className="overflow-hidden rounded-md border" style={{ height }}>
        <TaskGraphCanvas
          model={graph.model}
          layout={graph.layout}
          frames={graph.frames}
          selectedId={selected?.id ?? null}
          onActivate={setSelectedId}
          onOpen={onOpen}
        />
      </div>
      <TaskGraphLegend showExternal={false} />
    </div>
  );
}
