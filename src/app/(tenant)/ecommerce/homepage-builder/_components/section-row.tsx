"use client"

import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { TonePill, rdButton } from "../../_components/ui"
import { cn } from "@/lib/utils"

export interface SectionRowLabels {
  moveUp: string
  moveDown: string
  toggle: string
  edit: string
  remove: string
}

/**
 * One homepage section in the "Sections" card (56px row): move up / down,
 * drag handle (decorative), title + type / display-mode pills, 12px meta,
 * visibility switch, edit and delete. Every icon button has an accessible
 * name. Inactive sections are dimmed. Wraps to two lines on phones.
 */
export function SectionRow({
  title,
  typeLabel,
  modeLabel,
  meta,
  active,
  isFirst,
  isLast,
  labels,
  onMoveUp,
  onMoveDown,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string
  typeLabel: string
  modeLabel: string | null
  meta: string
  active: boolean
  isFirst: boolean
  isLast: boolean
  labels: SectionRowLabels
  onMoveUp: () => void
  onMoveDown: () => void
  onToggle: (checked: boolean) => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li
      className="flex min-h-14 min-w-0 items-center gap-2 border-b px-2 py-2 last:border-b-0 sm:gap-3 sm:px-3"
      data-testid="hb-section-row"
      data-active={active || undefined}
    >
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          className={cn(rdButton.ghostIconSm, "h-6")}
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={labels.moveUp}
          title={labels.moveUp}
        >
          <ArrowUp className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className={cn(rdButton.ghostIconSm, "h-6")}
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={labels.moveDown}
          title={labels.moveDown}
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 sm:block" aria-hidden />

      <div className={cn("flex min-w-0 flex-1 flex-col gap-1", !active && "opacity-60")}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 max-w-full truncate text-[13px] font-medium">{title}</span>
          <TonePill tone="neutral">{typeLabel}</TonePill>
          {modeLabel && (
            <TonePill tone="info" className="max-sm:hidden">
              {modeLabel}
            </TonePill>
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground tabular-nums">{meta}</span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Switch checked={active} onCheckedChange={onToggle} aria-label={labels.toggle} className="me-1" />
        <button type="button" className={rdButton.ghostIconSm} onClick={onEdit} aria-label={labels.edit} title={labels.edit}>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
          onClick={onDelete}
          aria-label={labels.remove}
          title={labels.remove}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </li>
  )
}
