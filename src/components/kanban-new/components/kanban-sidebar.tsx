"use client"

import { KanbanAddColumnSidebar } from "./kanban-add-column-sidebar"
import { KanbanUpdateColumnSidebar } from "./kanban-update-column-sidebar"

export function KanbanSidebar() {
  return (
    <>
      <KanbanAddColumnSidebar />
      <KanbanUpdateColumnSidebar />
    </>
  )
}
