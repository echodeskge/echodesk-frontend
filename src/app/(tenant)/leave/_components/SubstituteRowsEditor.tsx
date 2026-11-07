"use client"

import { useTranslations } from "next-intl"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LiteUser } from "../_lib/hr-api"
import { moveItem } from "../_lib/hr-utils"
import { SUBSTITUTE_TASK_MAX, type SubstituteDraftRow } from "../_lib/substitutes-utils"
import { UserPicker } from "./UserPicker"

interface Props {
  rows: SubstituteDraftRow[]
  onChange: (rows: SubstituteDraftRow[]) => void
  users: LiteUser[]
  /** The caller; never offered as their own substitute. */
  selfId?: number
  disabled?: boolean
  /** Show up/down buttons (order = who is asked first). */
  reorderable?: boolean
}

/** Editable list of {substitute, task} rows. */
export function SubstituteRowsEditor({ rows, onChange, users, selfId, disabled, reorderable = true }: Props) {
  const t = useTranslations("leave")
  const update = (index: number, patch: Partial<SubstituteDraftRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const chosen = rows.map((r) => r.substitute).filter((id): id is number => id !== null)
  const exclude = selfId !== undefined ? [...chosen, selfId] : chosen

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("hr.substitutes.emptyRows")}</p>
      )}
      {rows.map((row, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center"
        >
          <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">{index + 1}.</span>
          <div className="sm:w-64 shrink-0">
            <UserPicker
              users={users}
              value={row.substitute}
              onChange={(id) => update(index, { substitute: id })}
              excludeIds={exclude}
              disabled={disabled}
              placeholder={t("hr.substitutes.chooseSubstitute")}
            />
          </div>
          <Input
            value={row.task}
            maxLength={SUBSTITUTE_TASK_MAX}
            placeholder={t("hr.substitutes.taskPlaceholder")}
            aria-label={t("hr.substitutes.task")}
            disabled={disabled}
            onChange={(e) => update(index, { task: e.target.value })}
            className="flex-1"
          />
          <div className="flex gap-1 shrink-0">
            {reorderable && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t("hr.substitutes.moveUp")}
                  disabled={disabled || index === 0}
                  onClick={() => onChange(moveItem(rows, index, -1))}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t("hr.substitutes.moveDown")}
                  disabled={disabled || index === rows.length - 1}
                  onClick={() => onChange(moveItem(rows, index, 1))}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t("hr.common.remove")}
              disabled={disabled}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...rows, { substitute: null, task: "" }])}
      >
        <Plus className="h-4 w-4 mr-1" />
        {t("hr.substitutes.addRow")}
      </Button>
    </div>
  )
}
