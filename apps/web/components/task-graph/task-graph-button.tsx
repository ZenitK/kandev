import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconHierarchy3 } from "@tabler/icons-react";
import { Button } from "@kandev/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@kandev/ui/tooltip";
import { useTaskGraphAvailable } from "@/hooks/domains/task/use-task-graph-available";
import { TaskGraphDialog } from "./task-graph-dialog";

/** Status-row entry point; renders nothing when the task has no relations. */
export function TaskGraphButton({ taskId }: { taskId: string | null }) {
  const { t } = useTranslation();
  const available = useTaskGraphAvailable(taskId);
  const [open, setOpen] = useState(false);
  if (!taskId || !available) return null;
  return (
    <Tooltip>
      <TaskGraphDialog
        taskId={taskId}
        open={open}
        onOpenChange={setOpen}
        trigger={
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("task:taskGraphTitle")}
              data-testid="task-graph-button"
              className="cursor-pointer text-muted-foreground [@media(pointer:coarse)]:size-11"
            >
              <IconHierarchy3 className="size-3.5" />
            </Button>
          </TooltipTrigger>
        }
      />
      <TooltipContent>{t("task:taskGraphTitle")}</TooltipContent>
    </Tooltip>
  );
}
