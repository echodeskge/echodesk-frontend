"use client"

import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"

import type { ColumnType } from "../types"

import { useKanbanContext } from "../use-kanban-context"
import { useTicketCreate } from "@/contexts/TicketCreateContext"
import { Button } from "@/components/ui/button"

interface KanbanTaskListProps {
  column: ColumnType
}

export function KanbanAddNewTaskButton({ column }: KanbanTaskListProps) {
  const { selectedBoard, columns } = useKanbanContext()
  const { openTicketCreate } = useTicketCreate()
  const t = useTranslations('tickets')

  const handleClick = () => {
    // Find the API column that matches this UI column
    const apiColumn = columns?.find(col => col.id.toString() === column.id)

    openTicketCreate(selectedBoard, apiColumn)
  }

  return (
    <Button
      variant="outline"
      className="w-full my-2"
      onClick={handleClick}
    >
      <Plus className="me-2 size-4 text-muted-foreground" />
      {t('addNewTask')}
    </Button>
  )
}
