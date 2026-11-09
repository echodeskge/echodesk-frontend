"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Check, Users } from "lucide-react"
import { departmentsList } from "@/api/generated/api"
import { cn, getApiErrorMessage } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { fetchAttendance, unwrapList, type AttendanceGrid } from "../_lib/hr-api"
import { currentPeriod, formatPeriod, formatWeekdayShort } from "../_lib/hr-utils"
import {
  classifyAttendanceCell,
  dayOfMonth,
  isMutedDay,
  summarizeCells,
  type AttendanceCellKind,
} from "../_lib/attendance-utils"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { FeatureGate } from "../_components/FeatureGate"
import { MonthPicker } from "../_components/MonthPicker"
import {
  LeaveAvatar,
  LeaveEmptyState,
  LeaveErrorState,
  LeaveHeaderBridge,
  LeaveLoading,
  LeavePage,
  LeaveToolbar,
  formatLeaveDate,
  safeLeaveColor,
} from "../_components/ui"

const ALL = "all"

/** 28x28 day cell fill per kind (leave cells take the leave type colour). */
const CELL_CLASS: Record<AttendanceCellKind, string> = {
  worked: "bg-green-600/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  leave: "",
  off: "bg-muted",
  future: "border border-dashed border-border",
  not_employed:
    "bg-muted [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,hsl(var(--border))_3px,hsl(var(--border))_4px)]",
  unknown: "",
}

const FALLBACK_LEAVE = "#94a3b8"

/** 8px legend swatch + 11px label. */
function LegendItem({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground">
      {swatch}
      {children}
    </span>
  )
}

export default function AttendancePage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const { loaded, features, isLeaveManager } = useLeaveFeatures()
  const enabled = Boolean(features?.attendance) && isLeaveManager

  const [period, setPeriod] = useState(currentPeriod())
  const [department, setDepartment] = useState<string>(ALL)
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])
  const [grid, setGrid] = useState<AttendanceGrid | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)

  useEffect(() => {
    if (!enabled) return
    departmentsList(undefined, undefined, undefined, 200)
      .then((res) => setDepartments(unwrapList<{ id: number; name: string }>(res)))
      .catch(() => setDepartments([]))
  }, [enabled])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setGrid(
        await fetchAttendance({
          period,
          department: department === ALL ? undefined : department,
          lang: locale,
        })
      )
    } catch (error) {
      setGrid(null)
      setLoadError(error)
      toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setLoading(false)
    }
  }, [period, department, locale, t])

  useEffect(() => {
    if (enabled) load()
  }, [enabled, load])

  const legendByCode = useMemo(
    () => new Map((grid?.legend ?? []).map((l) => [l.code, l])),
    [grid]
  )

  const swatch = (cls: string, color?: string) => (
    <span
      aria-hidden
      className={cn("h-2 w-2 shrink-0 rounded-[2px]", cls)}
      style={color ? { backgroundColor: color } : undefined}
    />
  )

  const rows = grid?.rows ?? []

  return (
    <FeatureGate loaded={loaded} allowed={enabled}>
      <LeaveHeaderBridge sub={formatPeriod(period, locale)} />
      <LeavePage fill testId="attendance-page">
        <LeaveToolbar testId="attendance-toolbar">
          <MonthPicker value={period} onChange={setPeriod} />
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger
              className="h-8 w-[180px] text-[13px]"
              aria-label={t("hr.attendance.departmentLabel")}
              data-testid="attendance-department"
            >
              <SelectValue placeholder={t("hr.attendance.department")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("hr.attendance.allDepartments")}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {grid && rows.length > 0 && (
            <div
              className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 md:ms-auto"
              aria-label={t("hr.attendance.legend")}
              role="list"
              data-testid="attendance-legend"
            >
              <span role="listitem">
                <LegendItem swatch={swatch("bg-green-600 dark:bg-green-500")}>{t("hr.attendance.codes.worked")}</LegendItem>
              </span>
              {grid.legend.map((l) => (
                <span role="listitem" key={l.code}>
                  <LegendItem swatch={swatch("", safeLeaveColor(l.color) ?? FALLBACK_LEAVE)}>
                    {l.name}
                    {!l.is_paid && <span className="text-muted-foreground/80">({t("hr.attendance.unpaid")})</span>}
                  </LegendItem>
                </span>
              ))}
              <span role="listitem">
                <LegendItem swatch={swatch("bg-muted-foreground/30")}>{t("hr.attendance.codes.off")}</LegendItem>
              </span>
              <span role="listitem">
                <LegendItem swatch={swatch("border border-dashed border-muted-foreground/60")}>
                  {t("hr.attendance.codes.future")}
                </LegendItem>
              </span>
              <span role="listitem">
                <LegendItem swatch={swatch(CELL_CLASS.not_employed)}>{t("hr.attendance.codes.not_employed")}</LegendItem>
              </span>
            </div>
          )}
        </LeaveToolbar>

        {loading ? (
          <LeaveLoading className="flex-1" />
        ) : loadError ? (
          <LeaveErrorState error={loadError} onRetry={load} />
        ) : !grid || rows.length === 0 ? (
          <LeaveEmptyState icon={Users} title={t("hr.attendance.empty")} testId="attendance-empty" />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto" data-testid="attendance-grid-scroll">
              <table
                className="w-max min-w-full border-separate border-spacing-0 text-xs"
                aria-label={t("hr.attendance.title")}
                data-testid="attendance-grid"
              >
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky start-0 top-0 z-30 h-10 w-[132px] min-w-[132px] border-b border-e bg-background px-3 text-start text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground sm:w-[180px] sm:min-w-[180px] sm:px-4"
                    >
                      {t("shared.employee")}
                    </th>
                    {grid.days.map((day) => {
                      const muted = isMutedDay(day)
                      const header = (
                        <span
                          className={cn(
                            "flex flex-col items-center leading-[13px]",
                            muted ? "text-muted-foreground" : "text-foreground",
                            day.kind === "holiday" && "text-destructive"
                          )}
                        >
                          <span className="text-[10px] font-normal">
                            {formatWeekdayShort(new Date(`${day.date}T00:00:00`), locale)}
                          </span>
                          <span className="text-[11px] font-medium tabular-nums">{dayOfMonth(day.date)}</span>
                        </span>
                      )
                      return (
                        <th
                          key={day.date}
                          scope="col"
                          className={cn(
                            "sticky top-0 z-20 h-10 w-8 min-w-8 border-b bg-background p-0 font-normal",
                            muted && "bg-muted/60 dark:bg-muted/40"
                          )}
                        >
                          {day.kind === "holiday" ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex cursor-help justify-center" tabIndex={0}>
                                  {header}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{day.holiday_name || t("hr.attendance.holiday")}</TooltipContent>
                            </Tooltip>
                          ) : (
                            header
                          )}
                        </th>
                      )
                    })}
                    <th
                      scope="col"
                      title={t("hr.attendance.summary")}
                      className="sticky top-0 z-30 h-10 max-w-[96px] truncate whitespace-nowrap border-b border-s bg-background px-3 text-end text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground sm:end-0 sm:max-w-none"
                    >
                      {t("hr.attendance.summary")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const sum = summarizeCells(row.cells)
                    return (
                      <tr key={row.user.id} className="group" data-testid="attendance-row">
                        <th
                          scope="row"
                          className="sticky start-0 z-10 h-9 w-[132px] min-w-[132px] max-w-[132px] border-b border-e bg-background px-3 text-start font-normal group-hover:bg-muted sm:w-[180px] sm:min-w-[180px] sm:max-w-[180px] sm:px-4"
                          title={row.user.department ? `${row.user.name} · ${row.user.department}` : row.user.name}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <LeaveAvatar name={row.user.name} className="hidden sm:flex" />
                            <span className="truncate text-[13px] font-medium">{row.user.name}</span>
                          </span>
                        </th>
                        {grid.days.map((day) => {
                          const code = row.cells[day.date]
                          const cell = classifyAttendanceCell(code, legendByCode)
                          const label =
                            cell.kind === "leave"
                              ? cell.legend?.name || t("hr.attendance.leave")
                              : t(`hr.attendance.codes.${cell.kind}`)
                          const title = `${formatLeaveDate(day.date, locale, { year: "never" })} · ${label}`
                          return (
                            <td
                              key={day.date}
                              className={cn(
                                "h-9 border-b p-0 text-center align-middle group-hover:bg-muted/40",
                                isMutedDay(day) && "bg-muted/30"
                              )}
                            >
                              <span
                                title={title}
                                aria-label={title}
                                data-kind={cell.kind}
                                className={cn(
                                  "mx-auto flex h-7 w-7 items-center justify-center rounded",
                                  CELL_CLASS[cell.kind]
                                )}
                                style={
                                  cell.kind === "leave"
                                    ? { backgroundColor: safeLeaveColor(cell.legend?.color) ?? FALLBACK_LEAVE }
                                    : undefined
                                }
                              >
                                {cell.kind === "worked" && <Check className="h-3 w-3" aria-hidden />}
                              </span>
                            </td>
                          )
                        })}
                        <td className="h-9 whitespace-nowrap border-b border-s bg-background px-3 text-end text-xs tabular-nums group-hover:bg-muted sm:sticky sm:end-0 sm:z-10">
                          {t("hr.attendance.summaryValue", { worked: sum.worked, leave: sum.leave })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-2 border-t px-4 py-1.5 text-[11px] text-muted-foreground">
              <span className="tabular-nums">{t("hr.common.employeesCount", { count: rows.length })}</span>
              <span aria-hidden>·</span>
              <span className="min-w-0">{t("hr.attendance.cardDescription")}</span>
            </div>
          </>
        )}
      </LeavePage>
    </FeatureGate>
  )
}
