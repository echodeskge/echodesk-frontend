"use client"

import { GripVertical } from "lucide-react"

import type { DraggableProvided } from "@hello-pangea/dnd"
import type { ColumnType } from "../types"

import { cn } from "@/lib/utils"

import { buttonVariants } from "@/components/ui/button"
import { CardHeader, CardTitle } from "@/components/ui/card"
import { KanbanColumnActions } from "./kanban-column-actions"

interface KanbanColumnItemHeaderProps {
  column: ColumnType
  provided: DraggableProvided
}

export function KanbanColumnItemHeader({
  column,
  provided,
}: KanbanColumnItemHeaderProps) {
  return (
    <CardHeader className="flex-row items-center space-y-0 gap-x-1.5 p-0 pb-2 shrink-0">
      <div
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-black cursor-grab"
        )}
        {...provided.dragHandleProps} // Draggable props for drag-and-drop functionality
        aria-label="Move task"
      >
        <GripVertical className="size-4" />
      </div>
      <div className="flex items-center gap-2 me-auto">
        {column.color && (
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />
        )}
        <CardTitle>{column.title}</CardTitle>
      </div>
      <KanbanColumnActions column={column} />
    </CardHeader>
  )
}
