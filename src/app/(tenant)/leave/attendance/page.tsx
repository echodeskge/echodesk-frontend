"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Check, Loader2, Users } from "lucide-react"
import { departmentsList } from "@/api/generated/api"
import { cn, getApiErrorMessage } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { fetchAttendance, unwrapList, type AttendanceGrid } from "../_lib/hr-api"
import { currentPeriod, formatPeriod } from "../_lib/hr-utils"
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

const ALL = "all"

const MUTED_CELL: Partial<Record<AttendanceCellKind, string>> = {
  off: "bg-muted",
  future: "bg-muted/40",
  not_employed: "bg-muted [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,hsl(var(--border))_3px,hsl(var(--border))_4px)]",
  unknown: "",
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

  useEffect(() => {
    if (!enabled) return
    departmentsList(undefined, undefined, undefined, 200)
      .then((res) => setDepartments(unwrapList<{ id: number; name: string }>(res)))
      .catch(() => setDepartments([]))
  }, [enabled])

  const load = useCallback(async () => {
    setLoading(true)
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
  const weekdayFmt = useMemo(
    () => new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-US", { weekday: "narrow" }),
    [locale]
  )

  return (
    <FeatureGate loaded={loaded} allowed={enabled}>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("hr.attendance.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("hr.attendance.description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-[200px]">
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
            <MonthPicker value={period} onChange={setPeriod} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{formatPeriod(period, locale)}</CardTitle>
            <CardDescription>{t("hr.attendance.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !grid || grid.rows.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("hr.attendance.empty")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-max min-w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 bg-background border-b border-r px-3 py-2 text-left font-medium min-w-[180px]">
                        {t("shared.employee")}
                      </th>
                      {grid.days.map((day) => {
                        const muted = isMutedDay(day)
                        const header = (
                          <div
                            className={cn(
                              "flex flex-col items-center leading-tight",
                              muted && "text-muted-foreground",
                              day.kind === "holiday" && "text-red-500/80"
                            )}
                          >
                            <span className="text-[10px]">{weekdayFmt.format(new Date(`${day.date}T00:00:00`))}</span>
                            <span className="font-medium">{dayOfMonth(day.date)}</span>
                          </div>
                        )
                        return (
                          <th
                            key={day.date}
                            className={cn("border-b px-0 py-1 w-7 min-w-7 font-normal", muted && "bg-muted/50")}
                          >
                            {day.kind === "holiday" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">{header}</div>
                                </TooltipTrigger>
                                <TooltipContent>{day.holiday_name || t("hr.attendance.holiday")}</TooltipContent>
                              </Tooltip>
                            ) : (
                              header
                            )}
                          </th>
                        )
                      })}
                      <th className="border-b border-l px-2 py-2 font-medium whitespace-nowrap">
                        {t("hr.attendance.summary")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {grid.rows.map((row) => {
                      const sum = summarizeCells(row.cells)
                      return (
                        <tr key={row.user.id} className="hover:bg-muted/30">
                          <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-1.5">
                            <div className="font-medium truncate max-w-[220px]">{row.user.name}</div>
                            {row.user.department && (
                              <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                                {row.user.department}
                              </div>
                            )}
                          </td>
                          {grid.days.map((day) => {
                            const code = row.cells[day.date]
                            const cell = classifyAttendanceCell(code, legendByCode)
                            const title =
                              cell.kind === "leave"
                                ? cell.legend?.name || t("hr.attendance.leave")
                                : t(`hr.attendance.codes.${cell.kind}`)
                            return (
                              <td
                                key={day.date}
                                title={`${day.date} · ${title}`}
                                className={cn(
                                  "border-b border-r border-border/50 h-8 w-7 text-center align-middle",
                                  cell.kind !== "leave" && MUTED_CELL[cell.kind]
                                )}
                                style={
                                  cell.kind === "leave"
                                    ? { backgroundColor: cell.legend?.color || "#94a3b8" }
                                    : undefined
                                }
                              >
                                {cell.kind === "worked" && (
                                  <Check className="h-3.5 w-3.5 mx-auto text-green-600" aria-label={title} />
                                )}
                              </td>
                            )
                          })}
                          <td className="border-b border-l px-2 text-center whitespace-nowrap tabular-nums">
                            {t("hr.attendance.summaryValue", { worked: sum.worked, leave: sum.leave })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {grid && grid.rows.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <span className="font-medium">{t("hr.attendance.legend")}:</span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border">
                    <Check className="h-3 w-3 text-green-600" />
                  </span>
                  {t("hr.attendance.codes.worked")}
                </span>
                {grid.legend.map((l) => (
                  <span key={l.code} className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: l.color || "#94a3b8" }} />
                    {l.name}
                    {!l.is_paid && <span className="text-muted-foreground">({t("hr.attendance.unpaid")})</span>}
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-4 w-4 rounded-sm border", MUTED_CELL.off)} />
                  {t("hr.attendance.codes.off")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-4 w-4 rounded-sm border", MUTED_CELL.future)} />
                  {t("hr.attendance.codes.future")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-4 w-4 rounded-sm border", MUTED_CELL.not_employed)} />
                  {t("hr.attendance.codes.not_employed")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  )
}
