"use client"

import { Draggable } from "@hello-pangea/dnd"

import type { DraggableProvided } from "@hello-pangea/dnd"
import type { ColumnType } from "../types"

import { KanbanColumnItemHeader } from "./kanban-column-item-header"
import { KanbanTaskList } from "./kanban-task-list"

interface KanbanColumnProps {
  column: ColumnType
  index: number
}

export function KanbanColumnItem({ column, index }: KanbanColumnProps) {
  return (
    <Draggable
      // Namespaced so a column draggableId can never collide with a TASK
      // draggableId (task.id). @hello-pangea/dnd requires every draggableId
      // in the context to be globally unique across BOTH columns and tasks.
      // When a ticket's id equalled a column's id (ticket 11 vs column 11 on
      // amanati board 2), grabbing that ticket matched the column draggable
      // and dragged the WHOLE column. handleDragDrop keys columns off
      // type==="Column" + index (never this id), so the prefix is safe.
      draggableId={`col-${column.id}`}
      index={index} // The position of this column in the root, used for reordering columns when drag-and-drop occurs
    >
      {/* A render callback function that provides the necessary props
        for the Draggable component to function properly */}
      {(provided: DraggableProvided) => (
        <div
          ref={provided.innerRef}
          className="w-64 md:w-72 flex flex-col h-full"
          {...provided.draggableProps} // Draggable props for drag-and-drop functionality
        >
          <KanbanColumnItemHeader column={column} provided={provided} />
          <KanbanTaskList column={column} />
        </div>
      )}
    </Draggable>
  )
}
