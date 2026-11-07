"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { CalendarCheck, Loader2 } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MonthPicker } from "../../_components/MonthPicker"
import { fetchCoverage, setCoverageWorkedDays, type CoverageRow } from "../../_lib/hr-api"
import { currentPeriod, formatMoney, formatPeriod } from "../../_lib/hr-utils"
import { groupDaysByMonth, sameDays, toggleDay } from "../../_lib/payroll-utils"

export function WorkedDaysTab() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [period, setPeriod] = useState(currentPeriod())
  const [rows, setRows] = useState<CoverageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CoverageRow | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetchCoverage({ period }))
    } catch (error) {
      setRows([])
      toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setLoading(false)
    }
  }, [period, t])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (row: CoverageRow) => {
    setEditing(row)
    setSelected([...row.worked_days].sort())
  }

  // Workable days plus any already-confirmed day the server no longer offers
  // (kept, shown read-only, so saving does not silently drop it).
  const dayGroups = useMemo(() => {
    if (!editing) return []
    return groupDaysByMonth([...editing.workable_days, ...editing.worked_days])
  }, [editing])
  const workable = useMemo(() => new Set(editing?.workable_days ?? []), [editing])

  const handleSave = async () => {
    if (!editing || saving) return
    setSaving(true)
    try {
      const updated = await setCoverageWorkedDays(editing.id, selected)
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      toast.success(t("hr.payroll.worked.saved"))
      setEditing(null)
    } catch (error) {
      toast.error(t("hr.payroll.worked.saveFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setSaving(false)
    }
  }

  const fmtDay = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(locale === "ka" ? "ka-GE" : "en-US", {
      weekday: "short",
      day: "numeric",
    })

  return (
    <div className="space-y-4">
      <MonthPicker value={period} onChange={setPeriod} />
      <Card>
        <CardHeader>
          <CardTitle>{t("hr.payroll.worked.title", { period: formatPeriod(period, locale) })}</CardTitle>
          <CardDescription>{t("hr.payroll.worked.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t("hr.payroll.worked.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("hr.payroll.rates.substitute")}</TableHead>
                    <TableHead>{t("hr.payroll.worked.coveringFor")}</TableHead>
                    <TableHead>{t("hr.payroll.worked.leave")}</TableHead>
                    <TableHead>{t("hr.payroll.rates.rate")}</TableHead>
                    <TableHead className="text-right">{t("hr.payroll.worked.daysWorked")}</TableHead>
                    <TableHead>{t("hr.payroll.worked.totals")}</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const months = Object.keys(row.totals_by_month || {}).sort()
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.substitute_name}</div>
                          <div className="text-xs text-muted-foreground max-w-[240px] truncate" title={row.task}>
                            {row.task}
                          </div>
                        </TableCell>
                        <TableCell>{row.employee_name}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(row.start_date).toLocaleDateString()} – {new Date(row.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {row.rate_amount ? (
                            <span>
                              {formatMoney(row.rate_amount, locale)} {row.rate_currency}{" "}
                              <span className="text-muted-foreground">
                                / {t(`hr.payroll.rates.per.${row.rate_mode ?? "day"}`)}
                              </span>
                            </span>
                          ) : (
                            <Badge variant="outline">{t("hr.payroll.rates.noRate")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{row.worked_days.length}</TableCell>
                        <TableCell>
                          {months.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="space-y-0.5 text-sm">
                              {months.map((m) => (
                                <div key={m} className={m === period ? "font-semibold" : "text-muted-foreground"}>
                                  {formatPeriod(m, locale)}: {formatMoney(row.totals_by_month[m], locale)}{" "}
                                  {row.rate_currency}
                                </div>
                              ))}
                            </div>
                          )}
                          {row.worked_confirmed_by_name && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {t("hr.payroll.worked.confirmedBy", { name: row.worked_confirmed_by_name })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!row.rate_amount}
                            title={!row.rate_amount ? t("hr.payroll.worked.needsRate") : undefined}
                            onClick={() => openEdit(row)}
                          >
                            <CalendarCheck className="h-4 w-4 mr-1" />
                            {t("hr.payroll.worked.edit")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("hr.payroll.worked.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {editing &&
                t("hr.payroll.worked.dialogDescription", {
                  substitute: editing.substitute_name,
                  employee: editing.employee_name,
                })}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              {dayGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("hr.payroll.worked.noWorkable")}</p>
              ) : (
                dayGroups.map((group) => (
                  <div key={group.period} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">{formatPeriod(group.period, locale)}</h4>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setSelected((prev) =>
                              [...new Set([...prev, ...group.days.filter((d) => workable.has(d))])].sort()
                            )
                          }
                        >
                          {t("hr.payroll.worked.selectAll")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setSelected((prev) => prev.filter((d) => !group.days.includes(d) || !workable.has(d)))
                          }
                        >
                          {t("hr.payroll.worked.clear")}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {group.days.map((d) => {
                        const canEdit = workable.has(d)
                        return (
                          <label
                            key={d}
                            className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${
                              canEdit ? "cursor-pointer" : "opacity-60"
                            }`}
                            title={!canEdit ? t("hr.payroll.worked.notWorkable") : d}
                          >
                            <Checkbox
                              checked={selected.includes(d)}
                              disabled={!canEdit}
                              onCheckedChange={() => setSelected((prev) => toggleDay(prev, d))}
                            />
                            {fmtDay(d)}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
              <p className="text-sm text-muted-foreground">
                {t("hr.payroll.worked.selectedDays", { count: selected.length })}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t("hr.common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !editing || sameDays(selected, editing.worked_days)}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("hr.common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
