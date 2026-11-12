"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { SettingsToggle } from "@/components/redesign/settings/controls"
import { rdButton } from "@/components/redesign/buttons"
import { cn } from "@/lib/utils"
import { FieldShell, inputClass } from "./field-shell"

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
export type DayKey = (typeof DAY_KEYS)[number]

export interface DayHours {
  from: string
  to: string
  break_from?: string | null
  break_to?: string | null
}

/** `null` = closed that day. */
export type HoursValue = Record<DayKey, DayHours | null>

export const DEFAULT_DAY: DayHours = { from: "09:00", to: "18:00", break_from: null, break_to: null }

/** Mon–Fri 09:00–18:00, weekend closed. */
export function defaultHours(): HoursValue {
  return {
    mon: { ...DEFAULT_DAY },
    tue: { ...DEFAULT_DAY },
    wed: { ...DEFAULT_DAY },
    thu: { ...DEFAULT_DAY },
    fri: { ...DEFAULT_DAY },
    sat: null,
    sun: null,
  }
}

/** Accepts a partial / unknown payload (prefill) and fills the missing days. */
export function normalizeHours(raw: unknown): HoursValue {
  const out = defaultHours()
  if (!raw || typeof raw !== "object") return out
  const rec = raw as Record<string, unknown>
  for (const day of DAY_KEYS) {
    if (!(day in rec)) continue
    const v = rec[day]
    if (v === null) {
      out[day] = null
    } else if (v && typeof v === "object") {
      const d = v as Partial<DayHours>
      out[day] = {
        from: typeof d.from === "string" ? d.from : DEFAULT_DAY.from,
        to: typeof d.to === "string" ? d.to : DEFAULT_DAY.to,
        break_from: typeof d.break_from === "string" ? d.break_from : null,
        break_to: typeof d.break_to === "string" ? d.break_to : null,
      }
    }
  }
  return out
}

const timeClass = cn(inputClass, "h-8 w-[92px] px-1.5 text-xs tabular-nums")

/**
 * Opening hours Mon–Sun: open switch, from/to and an optional break per day.
 * Returns `{mon: {from, to, break_from, break_to} | null, ...}`.
 */
export function HoursGrid({
  label,
  help,
  error,
  value,
  onChange,
  disabled,
  className,
  testId = "hours-grid",
}: {
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  value: HoursValue
  onChange: (value: HoursValue) => void
  disabled?: boolean
  className?: string
  testId?: string
}) {
  const t = useTranslations("onboarding.fields.hours")

  const setDay = (day: DayKey, next: DayHours | null) => onChange({ ...value, [day]: next })
  const patch = (day: DayKey, p: Partial<DayHours>) => {
    const cur = value[day] ?? { ...DEFAULT_DAY }
    setDay(day, { ...cur, ...p })
  }
  const copyMonday = () => {
    const mon = value.mon
    const next = { ...value }
    for (const day of DAY_KEYS) next[day] = mon ? { ...mon } : null
    onChange(next)
  }

  return (
    <FieldShell as="div" label={label} help={help} error={error} className={className} testId={testId}>
      <div className="overflow-hidden rounded-[10px] border bg-card">
        {DAY_KEYS.map((day) => {
          const d = value[day]
          const open = d !== null
          const hasBreak = open && (d.break_from != null || d.break_to != null)
          return (
            <div
              key={day}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2 last:border-b-0",
                !open && "text-muted-foreground"
              )}
              data-testid={`${testId}-${day}`}
            >
              <div className="flex w-[88px] shrink-0 items-center gap-2">
                <SettingsToggle
                  size="sm"
                  checked={open}
                  disabled={disabled}
                  onCheckedChange={(on) => setDay(day, on ? { ...DEFAULT_DAY } : null)}
                  aria-label={`${t(`days.${day}`)}: ${open ? t("open") : t("closed")}`}
                  data-testid={`${testId}-${day}-toggle`}
                />
                <span className="text-[13px] font-medium">{t(`days.${day}`)}</span>
              </div>
              {open ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={d.from}
                      disabled={disabled}
                      aria-label={`${t(`days.${day}`)} ${t("from")}`}
                      onChange={(e) => patch(day, { from: e.target.value })}
                      className={timeClass}
                      data-testid={`${testId}-${day}-from`}
                    />
                    <span aria-hidden className="text-xs">
                      –
                    </span>
                    <input
                      type="time"
                      value={d.to}
                      disabled={disabled}
                      aria-label={`${t(`days.${day}`)} ${t("to")}`}
                      onChange={(e) => patch(day, { to: e.target.value })}
                      className={timeClass}
                      data-testid={`${testId}-${day}-to`}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={hasBreak}
                      disabled={disabled}
                      onChange={(e) =>
                        patch(day, e.target.checked ? { break_from: "13:00", break_to: "14:00" } : { break_from: null, break_to: null })
                      }
                      className="h-3.5 w-3.5 accent-primary"
                      data-testid={`${testId}-${day}-break`}
                    />
                    {t("break")}
                  </label>
                  {hasBreak && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={d.break_from ?? ""}
                        disabled={disabled}
                        aria-label={`${t(`days.${day}`)} ${t("break")} ${t("from")}`}
                        onChange={(e) => patch(day, { break_from: e.target.value })}
                        className={timeClass}
                        data-testid={`${testId}-${day}-break-from`}
                      />
                      <span aria-hidden className="text-xs">
                        –
                      </span>
                      <input
                        type="time"
                        value={d.break_to ?? ""}
                        disabled={disabled}
                        aria-label={`${t(`days.${day}`)} ${t("break")} ${t("to")}`}
                        onChange={(e) => patch(day, { break_to: e.target.value })}
                        className={timeClass}
                        data-testid={`${testId}-${day}-break-to`}
                      />
                    </div>
                  )}
                </>
              ) : (
                <span className="text-xs">{t("closed")}</span>
              )}
            </div>
          )
        })}
      </div>
      <div>
        <button type="button" onClick={copyMonday} disabled={disabled} className={rdButton.outlineSm} data-testid={`${testId}-copy`}>
          {t("copyToAll")}
        </button>
      </div>
    </FieldShell>
  )
}
