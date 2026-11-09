"use client"

import { useTranslations } from "next-intl"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { LiteUser } from "../_lib/hr-api"
import { moveItem } from "../_lib/hr-utils"
import { SUBSTITUTE_TASK_MAX, type SubstituteDraftRow } from "../_lib/substitutes-utils"
import { UserPicker } from "./UserPicker"
import { leaveButton } from "./ui"

interface Props {
  rows: SubstituteDraftRow[]
  onChange: (rows: SubstituteDraftRow[]) => void
  users: LiteUser[]
  /** The caller; never offered as their own substitute. */
  selfId?: number
  disabled?: boolean
  /** Show up/down buttons (order = who is asked first). */
  reorderable?: boolean
  className?: string
}

/**
 * Editable list of {substitute, task} rows (LV-02 redesign): a bordered list
 * of rows with the order number, a 34px user picker and task input and 28px
 * icon buttons; stacked on phones. Same props and behaviour as before.
 */
export function SubstituteRowsEditor({ rows, onChange, users, selfId, disabled, reorderable = true, className }: Props) {
  const t = useTranslations("leave")
  const update = (index: number, patch: Partial<SubstituteDraftRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const chosen = rows.map((r) => r.substitute).filter((id): id is number => id !== null)
  const exclude = selfId !== undefined ? [...chosen, selfId] : chosen

  return (
    <div className={cn("flex flex-col gap-3", className)} data-testid="substitute-rows">
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
          {t("hr.substitutes.emptyRows")}
        </p>
      ) : (
        <ol className="overflow-hidden rounded-lg border">
          {rows.map((row, index) => (
            <li
              key={index}
              className="flex flex-wrap items-center gap-2 border-b px-3 py-2 last:border-b-0 sm:flex-nowrap"
              data-testid="substitute-row"
            >
              <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
              <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
                <UserPicker
                  users={users}
                  value={row.substitute}
                  onChange={(id) => update(index, { substitute: id })}
                  excludeIds={exclude}
                  disabled={disabled}
                  placeholder={t("hr.substitutes.chooseSubstitute")}
                  className="h-[34px] px-2.5 text-[13px]"
                />
              </div>
              <Input
                value={row.task}
                maxLength={SUBSTITUTE_TASK_MAX}
                placeholder={t("hr.substitutes.taskPlaceholder")}
                aria-label={t("hr.substitutes.task")}
                disabled={disabled}
                onChange={(e) => update(index, { task: e.target.value })}
                className="h-[34px] min-w-0 basis-full text-[13px] max-sm:order-last sm:basis-auto sm:flex-1"
              />
              <div className="flex shrink-0 items-center gap-0.5">
                {reorderable && (
                  <>
                    <button
                      type="button"
                      className={leaveButton.ghostIconSm}
                      aria-label={t("hr.substitutes.moveUp")}
                      title={t("hr.substitutes.moveUp")}
                      disabled={disabled || index === 0}
                      onClick={() => onChange(moveItem(rows, index, -1))}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={leaveButton.ghostIconSm}
                      aria-label={t("hr.substitutes.moveDown")}
                      title={t("hr.substitutes.moveDown")}
                      disabled={disabled || index === rows.length - 1}
                      onClick={() => onChange(moveItem(rows, index, 1))}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={cn(leaveButton.ghostIconSm, "hover:bg-destructive/10 hover:text-destructive")}
                  aria-label={t("hr.common.remove")}
                  title={t("hr.common.remove")}
                  disabled={disabled}
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div>
        <button
          type="button"
          className={leaveButton.outlineSm}
          disabled={disabled}
          onClick={() => onChange([...rows, { substitute: null, task: "" }])}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("hr.substitutes.addRow")}
        </button>
      </div>
    </div>
  )
}
