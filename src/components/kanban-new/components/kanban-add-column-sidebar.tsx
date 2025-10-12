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

export function KanbanAddColumnSidebar() {
  const t = useTranslations('tickets.columns')
  const tCommon = useTranslations('common')

  const {
    kanbanAddColumnSidebarIsOpen,
    setKanbanAddColumnSidebarIsOpen,
    handleAddColumn,
  } = useKanbanContext()

  const [title, setTitle] = useState("")
  const [color, setColor] = useState(DEFAULT_COLORS[5]) // Default to green
  const [timeTracking, setTimeTracking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when sidebar opens/closes
  useEffect(() => {
    if (!kanbanAddColumnSidebarIsOpen) {
      setTitle("")
      setColor(DEFAULT_COLORS[5])
      setTimeTracking(false)
      setIsSubmitting(false)
    }
  }, [kanbanAddColumnSidebarIsOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await handleAddColumn({
        title: title.trim(),
        color,
        time_tracking: timeTracking,
      })
      handleSidebarClose()
    } catch (error) {
      console.error('Error adding column:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSidebarClose = () => {
    setKanbanAddColumnSidebarIsOpen(false)
  }

  const isDisabled = !title.trim() || isSubmitting

  return (
    <Sheet
      open={kanbanAddColumnSidebarIsOpen}
      onOpenChange={handleSidebarClose}
    >
      <SheetContent className="p-0" side="right">
        <ScrollArea className="h-full p-4">
          <SheetHeader>
            <SheetTitle>{t('addColumnSidebarTitle')}</SheetTitle>
            <SheetDescription>
              {t('addColumnSidebarDescription')}
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
                    {t('addColumn')}
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
