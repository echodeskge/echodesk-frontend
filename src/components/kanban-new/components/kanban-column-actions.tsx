"use client"

import { useState } from "react"
import { EllipsisVertical } from "lucide-react"
import { useTranslations } from 'next-intl'

import type { ColumnType } from "../types"

import { useKanbanContext } from "../use-kanban-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface KanbanColumnActionsProps {
  column: ColumnType
}

export function KanbanColumnActions({ column }: KanbanColumnActionsProps) {
  const t = useTranslations('tickets.columns')
  const tCommon = useTranslations('common')
  const [open, onOpenChange] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const {
    setKanbanUpdateColumnSidebarIsOpen,
    handleSelectColumn,
    handleDeleteColumn,
  } = useKanbanContext()

  const handleDelete = async () => {
    setShowDeleteDialog(false)
    onOpenChange(false)
    await handleDeleteColumn(column.id)
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 ms-auto data-[state=open]:bg-muted"
            aria-label="More actions"
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            onClick={() => {
              handleSelectColumn(column)
              onOpenChange(false)
              setKanbanUpdateColumnSidebarIsOpen(true)
            }}
          >
            {t('editColumn')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              onOpenChange(false)
              setShowDeleteDialog(true)
            }}
          >
            {t('deleteColumn')}
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteColumn')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('deleteColumn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
