"use client"

import { Pencil, Trash2 } from "lucide-react"
import { rdButton } from "@/components/redesign/buttons"
import { cn } from "@/lib/utils"

/** Edit pencil + delete trash (28px ghost icon buttons) of a catalog table row. */
export function RowActions({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  disabled,
  testId,
}: {
  onEdit: () => void
  onDelete: () => void
  /** Accessible names, already translated (include the row's name). */
  editLabel: string
  deleteLabel: string
  disabled?: boolean
  testId?: string
}) {
  return (
    <span className="flex items-center justify-end gap-0.5" data-testid={testId}>
      <button type="button" className={rdButton.ghostIconSm} onClick={onEdit} disabled={disabled} aria-label={editLabel} title={editLabel} data-testid={testId ? `${testId}-edit` : undefined}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
        onClick={onDelete}
        disabled={disabled}
        aria-label={deleteLabel}
        title={deleteLabel}
        data-testid={testId ? `${testId}-delete` : undefined}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  )
}
