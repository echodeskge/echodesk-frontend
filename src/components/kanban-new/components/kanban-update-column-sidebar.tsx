"use client"

import { useEffect, useState } from "react"
import { useTranslations } from 'next-intl'
import { Grid2x2Plus } from "lucide-react"
import { useKanbanContext } from "../use-kanban-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const DEFAULT_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#EAB308", // yellow
  "#84CC16", // lime
  "#22C55E", // green
  "#10B981", // emerald
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#0EA5E9", // sky
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
  "#D946EF", // fuchsia
  "#EC4899", // pink
  "#6B7280", // gray
]

export function KanbanUpdateColumnSidebar() {
  const t = useTranslations('tickets.columns')
  const tCommon = useTranslations('common')

  const {
    kanbanState,
    kanbanUpdateColumnSidebarIsOpen,
    setKanbanUpdateColumnSidebarIsOpen,
    handleUpdateColumn,
  } = useKanbanContext()

  const selectedColumn = kanbanState.selectedColumn

  const [title, setTitle] = useState("")
  const [color, setColor] = useState(DEFAULT_COLORS[5])
  const [timeTracking, setTimeTracking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load column data when sidebar opens
  useEffect(() => {
    if (kanbanUpdateColumnSidebarIsOpen && selectedColumn) {
      setTitle(selectedColumn.title || "")
      setColor(selectedColumn.color || DEFAULT_COLORS[5])
      // Get time_tracking from the original API column data
      const apiColumn = selectedColumn as any
      setTimeTracking(apiColumn.time_tracking || false)
    }
  }, [kanbanUpdateColumnSidebarIsOpen, selectedColumn])

  // Reset form when sidebar closes
  useEffect(() => {
    if (!kanbanUpdateColumnSidebarIsOpen) {
      setIsSubmitting(false)
    }
  }, [kanbanUpdateColumnSidebarIsOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !selectedColumn || isSubmitting) return

    setIsSubmitting(true)
    try {
      await handleUpdateColumn({
        ...selectedColumn,
        title: title.trim(),
        color,
        time_tracking: timeTracking,
      } as any)
      handleSidebarClose()
    } catch (error) {
      console.error('Error updating column:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSidebarClose = () => {
    setKanbanUpdateColumnSidebarIsOpen(false)
  }

  const isDisabled = !title.trim() || isSubmitting

  return (
    <Sheet
      open={kanbanUpdateColumnSidebarIsOpen}
      onOpenChange={handleSidebarClose}
    >
      <SheetContent className="p-0" side="right">
        <ScrollArea className="h-full p-4">
          <SheetHeader>
            <SheetTitle>{t('editColumnSidebarTitle')}</SheetTitle>
            <SheetDescription>
              {t('editColumnSidebarDescription')}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="grid gap-y-4 mt-6">
            <div>
              <Label htmlFor="title">{t('columnTitle')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('columnTitlePlaceholder')}
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label>{t('columnColor')}</Label>
              <div className="grid grid-cols-9 gap-2 mt-2">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                      color === c
                        ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    disabled={isSubmitting}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10"
                  disabled={isSubmitting}
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#RRGGBB"
                  className="flex-1 font-mono"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="timeTracking"
                checked={timeTracking}
                onCheckedChange={(checked) => setTimeTracking(checked as boolean)}
                disabled={isSubmitting}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="timeTracking"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('timeTracking')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('timeTrackingDescription')}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSidebarClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isDisabled}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Grid2x2Plus className="mr-2 h-4 w-4 animate-spin" />
                    {tCommon('loading')}
                  </>
                ) : (
                  <>
                    <Grid2x2Plus className="mr-2 h-4 w-4" />
                    {t('updateColumn')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
