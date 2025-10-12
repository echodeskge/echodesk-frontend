"use client"

import { GripVertical } from "lucide-react"

import type { DraggableProvided } from "@hello-pangea/dnd"
import type { TaskType } from "../types"

import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { CardHeader } from "@/components/ui/card"
import { KanbanTaskItemActions } from "./kanban-task-item-actions"

interface KanbanTaskItemHeaderProps {
  task: TaskType
  provided: DraggableProvided
}

// Helper function to get priority color
function getPriorityColor(priority: string): string {
  const priorityLower = priority.toLowerCase();
  switch (priorityLower) {
    case 'high':
    case 'urgent':
      return '#dc3545'; // red
    case 'medium':
    case 'normal':
      return '#fd7e14'; // orange
    case 'low':
      return '#28a745'; // green
    default:
      return '#6c757d'; // gray
  }
}

export function KanbanTaskItemHeader({
  task,
  provided,
}: KanbanTaskItemHeaderProps) {
  const priorityColor = getPriorityColor(task.label);

  return (
    <CardHeader className="flex-row items-center space-y-0 gap-x-1.5 px-3 py-3.5">
      <div
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: "icon",
          }),
          "text-secondary-foreground/50 cursor-grab"
        )}
        {...provided.dragHandleProps} // Draggable props for drag-and-drop functionality
        aria-label="Move task"
      >
        <GripVertical className="size-4" />
      </div>
      <Badge
        style={{
          backgroundColor: `${priorityColor}20`,
          color: priorityColor,
          borderColor: priorityColor,
        }}
        className="border"
      >
        {task.label}
      </Badge>
      <KanbanTaskItemActions task={task} />
    </CardHeader>
  )
}
