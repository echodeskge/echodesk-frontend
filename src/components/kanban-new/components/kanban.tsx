// Refer to react-beautiful-dnd README.md file for more details https://github.com/atlassian/react-beautiful-dnd
"use client"

import { DragDropContext } from "@hello-pangea/dnd"

import type { DropResult } from "@hello-pangea/dnd"

import { useKanbanContext } from "../use-kanban-context"
import { KanbanColumnList } from "./kanban-column-list"
import { KanbanSidebar } from "./kanban-sidebar"

export function Kanban() {
  const { handleReorderColumns, handleReorderTasks } = useKanbanContext()

  const handleDragDrop = (result: DropResult) => {
    const { source, destination, type } = result

    // Ignore if there's no destination
    if (!destination) return

    // Ignore if dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    if (type === "Column") {
      handleReorderColumns(source.index, destination.index)
    } else {
      // Handle task reordering (type === "Task" or any other type)
      handleReorderTasks(
        source.droppableId,
        source.index,
        destination.droppableId,
        destination.index
      )
    }
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragDrop}>
        <KanbanColumnList />
      </DragDropContext>
      <KanbanSidebar />
    </>
  )
}
