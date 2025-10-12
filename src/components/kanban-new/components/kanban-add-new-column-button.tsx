"use client"

import { Plus } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"

export function KanbanAddNewColumnButton({
  setKanbanAddColumnSidebarIsOpen,
}: {
  setKanbanAddColumnSidebarIsOpen: (value: boolean) => void
}) {
  const t = useTranslations('tickets.columns')

  return (
    <Button
      variant="outline"
      className="w-64 md:w-72 mx-2"
      onClick={() => setKanbanAddColumnSidebarIsOpen(true)}
    >
      <Plus className="me-2 size-4 text-muted-foreground" />
      {t('addNewColumn')}
    </Button>
  )
}
