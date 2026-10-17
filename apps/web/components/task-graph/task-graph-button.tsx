import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconHierarchy3 } from "@tabler/icons-react";
import { useTaskGraphAvailable } from "@/hooks/domains/task/use-task-graph-available";
import { TaskGraphDialog } from "./task-graph-dialog";

/** Status-row entry point; renders nothing when the task has no relations. */
export function TaskGraphButton({ taskId }: { taskId: string | null }) {
  const { t } = useTranslation();
  const available = useTaskGraphAvailable(taskId);
  const [open, setOpen] = useState(false);
  if (!taskId || !available) return null;
  return (
    <TaskGraphDialog
      taskId={taskId}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          type="button"
          data-testid="task-graph-button"
          className="inline-flex h-[26px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium leading-none text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [@media(pointer:coarse)]:min-h-11"
        >
          <IconHierarchy3 aria-hidden="true" className="size-3.5" />
          {t("task:taskGraphTitle")}
        </button>
      }
    />
  );
}
