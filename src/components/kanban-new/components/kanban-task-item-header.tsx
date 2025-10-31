"use client"

import type { TaskType } from "../types"

import { Badge } from "@/components/ui/badge"
import { CardHeader } from "@/components/ui/card"
import { KanbanTaskItemActions } from "./kanban-task-item-actions"

interface KanbanTaskItemHeaderProps {
  task: TaskType
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
}: KanbanTaskItemHeaderProps) {
  const priorityColor = getPriorityColor(task.label);

  return (
    <CardHeader className="flex-row items-center space-y-0 gap-x-1.5 px-3 py-3.5">
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
      {/* Display Trello-style labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <Badge
              key={label.id}
              style={{
                backgroundColor: label.color,
                color: '#ffffff',
              }}
              className="text-xs px-2 py-0.5 font-medium"
            >
              {label.name}
            </Badge>
          ))}
        </div>
      )}
      <KanbanTaskItemActions task={task} />
    </CardHeader>
  )
}
