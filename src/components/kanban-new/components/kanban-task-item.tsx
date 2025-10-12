"use client"

import { useRouter } from "next/navigation"
import { Draggable } from "@hello-pangea/dnd"

import type { DraggableProvided } from "@hello-pangea/dnd"
import type { TaskType } from "../types"

import { Card } from "@/components/ui/card"
import { KanbanTaskItemContent } from "./kanban-task-item-content"
import { KanbanTaskItemFooter } from "./kanban-task-item-footer"
import { KanbanTaskItemHeader } from "./kanban-task-item-header"

interface KanbanTaskItemProps {
  task: TaskType
  index: number
}

export function KanbanTaskItem({ task, index }: KanbanTaskItemProps) {
  const router = useRouter()

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) {
      return
    }

    // Pure subdomain routing - just navigate to /ticket/{id}
    router.push(`/ticket/${task.id}`)
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided: DraggableProvided) => (
        <Card
          ref={provided.innerRef}
          className="my-2 w-full cursor-pointer transition-shadow hover:shadow-md"
          onClick={handleCardClick}
          {...provided.draggableProps}
        >
          <KanbanTaskItemHeader task={task} provided={provided} />
          <KanbanTaskItemContent task={task} />
          <KanbanTaskItemFooter task={task} />
        </Card>
      )}
    </Draggable>
  )
}
