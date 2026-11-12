"use client"

import type { CSSProperties, ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Plus, Trash2 } from "lucide-react"
import { rdButton } from "@/components/redesign/buttons"
import { cn } from "@/lib/utils"
import { FieldShell, inputClass } from "./field-shell"

export type EditableColumn<Row> =
  | {
      key: keyof Row & string
      label: string
      type?: "text" | "email" | "number"
      placeholder?: string
      width?: string
      required?: boolean
    }
  | {
      key: keyof Row & string
      label: string
      type: "select"
      options: Array<{ value: string; label: string }>
      placeholder?: string
      width?: string
    }
  | {
      key: string
      label: string
      type: "custom"
      width?: string
      render: (row: Row, update: (patch: Partial<Row>) => void, index: number) => ReactNode
    }

export interface EditableTableProps<Row extends object> {
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  columns: EditableColumn<Row>[]
  rows: Row[]
  onChange: (rows: Row[]) => void
  /** A fresh empty row for "Add". */
  newRow: () => Row
  /** Per-row field errors aligned with `rows` (`{email: ["..."]}`). */
  rowErrors?: Array<Record<string, unknown>>
  addLabel?: string
  emptyText?: string
  disabled?: boolean
  /** Rows may not go below this count (default 0). */
  minRows?: number
  className?: string
  testId?: string
}

function cellError(rowErrors: Record<string, unknown> | undefined, key: string): string | null {
  const v = rowErrors?.[key]
  if (typeof v === "string") return v
  if (Array.isArray(v) && typeof v[0] === "string") return v[0]
  return null
}

/**
 * Rows of inputs/selects with add/remove: team invites, services, leave
 * types… Renders as a grid from `sm`, as stacked cards on phones.
 */
export function EditableTable<Row extends object>({
  label,
  help,
  error,
  columns,
  rows,
  onChange,
  newRow,
  rowErrors,
  addLabel,
  emptyText,
  disabled,
  minRows = 0,
  className,
  testId = "editable-table",
}: EditableTableProps<Row>) {
  const t = useTranslations("onboarding.fields.table")

  const update = (index: number, patch: Partial<Row>) => onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index))
  const add = () => onChange([...rows, newRow()])

  const template = columns.map((c) => c.width ?? "minmax(0,1fr)").join(" ") + " 28px"

  return (
    <FieldShell as="div" label={label} help={help} error={error} className={className} testId={testId}>
      <div className="overflow-hidden rounded-[10px] border bg-card">
        <div
          className="hidden items-center gap-2 border-b bg-muted/35 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c) => (
            <span key={c.key} className="truncate">
              {c.label}
            </span>
          ))}
          <span />
        </div>
        {rows.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground" data-testid={`${testId}-empty`}>
            {emptyText ?? t("empty")}
          </div>
        )}
        {rows.map((row, index) => {
          const errs = rowErrors?.[index]
          return (
            <div key={index} className="border-b p-3 last:border-b-0 sm:px-3 sm:py-2" data-testid={`${testId}-row-${index}`}>
              <div
                className="grid grid-cols-1 gap-2 sm:items-start sm:[grid-template-columns:var(--onb-cols)]"
                style={{ "--onb-cols": template } as CSSProperties}
              >
                {columns.map((c) => {
                  const err = cellError(errs, c.key)
                  const rec = row as Record<string, unknown>
                  return (
                    <div key={c.key} className="flex min-w-0 flex-col gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground sm:hidden">{c.label}</span>
                      {c.type === "custom" ? (
                        c.render(row, (patch) => update(index, patch), index)
                      ) : c.type === "select" ? (
                        <select
                          value={(rec[c.key] as string | null | undefined) ?? ""}
                          disabled={disabled}
                          aria-label={c.label}
                          aria-invalid={err ? true : undefined}
                          onChange={(e) => update(index, { [c.key]: e.target.value === "" ? null : e.target.value } as Partial<Row>)}
                          className={cn(inputClass, "h-8 text-xs")}
                          data-testid={`${testId}-row-${index}-${c.key}`}
                        >
                          {c.placeholder !== undefined && <option value="">{c.placeholder}</option>}
                          {c.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={c.type ?? "text"}
                          value={(rec[c.key] as string | number | null | undefined) ?? ""}
                          placeholder={c.placeholder}
                          disabled={disabled}
                          aria-label={c.label}
                          aria-invalid={err ? true : undefined}
                          onChange={(e) =>
                            update(index, {
                              [c.key]: c.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value,
                            } as Partial<Row>)
                          }
                          className={cn(inputClass, "h-8 text-xs")}
                          data-testid={`${testId}-row-${index}-${c.key}`}
                        />
                      )}
                      {err && (
                        <span role="alert" className="text-[11px] text-destructive">
                          {err}
                        </span>
                      )}
                    </div>
                  )
                })}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={disabled || rows.length <= minRows}
                  aria-label={t("remove")}
                  title={t("remove")}
                  className={cn(rdButton.ghostIconSm, "justify-self-end sm:justify-self-auto")}
                  data-testid={`${testId}-row-${index}-remove`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div>
        <button type="button" onClick={add} disabled={disabled} className={rdButton.outlineSm} data-testid={`${testId}-add`}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {addLabel ?? t("add")}
        </button>
      </div>
    </FieldShell>
  )
}
