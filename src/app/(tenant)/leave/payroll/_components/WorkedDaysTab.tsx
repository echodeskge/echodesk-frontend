"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { CalendarCheck, Loader2 } from "lucide-react"
import { cn, getApiErrorMessage } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { fetchCoverage, setCoverageWorkedDays, type CoverageRow } from "../../_lib/hr-api"
import { formatMoney, formatPeriod, formatWeekdayShort } from "../../_lib/hr-utils"
import { groupDaysByMonth, sameDays, toggleDay } from "../../_lib/payroll-utils"
import { coverageMonthTotals } from "../../_lib/lv03-utils"
import {
  LeaveAvatar,
  LeaveEmptyState,
  LeaveTable,
  SectionCard,
  TonePill,
  formatLeaveDate,
  formatLeaveRange,
  leaveButton,
  type LeaveColumn,
} from "../../_components/ui"
import { MoneyCell } from "./money"

export function WorkedDaysTab({ period }: { period: string }) {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [rows, setRows] = useState<CoverageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [editing, setEditing] = useState<CoverageRow | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setRows(await fetchCoverage({ period }))
    } catch (error) {
      setRows([])
      setLoadError(error)
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

  const fmtDay = (d: string) => {
    const date = new Date(`${d}T00:00:00`)
    if (locale === "ka") return `${date.getDate()}, ${formatWeekdayShort(date, locale)}`
    return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })
  }

  const periodLabel = formatPeriod(period, locale)

  const columns: LeaveColumn<CoverageRow>[] = [
    {
      id: "substitute",
      header: t("hr.payroll.rates.substitute"),
      width: "minmax(160px,1.2fr)",
      mobile: "title",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2" title={row.task}>
          <LeaveAvatar name={row.substitute_name} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium">{row.substitute_name}</span>
            <span className="hidden truncate text-[11px] text-muted-foreground @3xl:block">{row.task}</span>
          </span>
        </span>
      ),
    },
    {
      id: "employee",
      header: t("hr.payroll.worked.coveringFor"),
      width: "minmax(130px,1fr)",
      mobile: "meta",
      cell: (row) => <span className="truncate">{row.employee_name}</span>,
    },
    {
      id: "leave",
      header: t("hr.payroll.worked.leave"),
      width: "150px",
      mobile: "meta",
      muted: true,
      cell: (row) => <span className="tabular-nums">{formatLeaveRange(row.start_date, row.end_date, locale)}</span>,
    },
    {
      id: "rate",
      header: t("hr.payroll.rates.rate"),
      width: "150px",
      align: "end",
      mobile: "meta",
      cell: (row) =>
        row.rate_amount ? (
          <span className="flex items-baseline gap-1 whitespace-nowrap">
            <MoneyCell amount={formatMoney(row.rate_amount, locale)} currency={row.rate_currency} />
            <span className="text-[11px] text-muted-foreground">/ {t(`hr.payroll.rates.per.${row.rate_mode ?? "day"}`)}</span>
          </span>
        ) : (
          <TonePill tone="neutral">{t("hr.payroll.rates.noRate")}</TonePill>
        ),
    },
    {
      id: "days",
      header: <span title={t("hr.payroll.worked.daysWorked")} className="truncate">{t("hr.payroll.worked.daysWorked")}</span>,
      width: "104px",
      align: "end",
      mobile: "meta",
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums">
          <span className="me-1 font-sans text-muted-foreground @3xl:hidden">{t("hr.payroll.worked.daysWorked")}</span>
          {row.worked_days.length}
        </span>
      ),
    },
    {
      id: "pay",
      header: t("hr.payroll.worked.totals"),
      width: "150px",
      align: "end",
      mobile: "end",
      cell: (row) => {
        const { current, others } = coverageMonthTotals(row.totals_by_month, period)
        const tooltip = [
          ...(current !== null ? [{ period, amount: current }] : []),
          ...others,
        ]
          .map((m) => `${formatPeriod(m.period, locale)}: ${formatMoney(m.amount, locale)} ${row.rate_currency ?? ""}`.trim())
          .concat(row.worked_confirmed_by_name ? [t("hr.payroll.worked.confirmedBy", { name: row.worked_confirmed_by_name })] : [])
          .join("\n")
        return (
          <span className="flex flex-col items-end leading-tight" title={tooltip || undefined}>
            <span className="flex items-baseline gap-1">
              {current !== null ? (
                <MoneyCell amount={formatMoney(current, locale)} currency={row.rate_currency} strong />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              {others.length > 0 && (
                <span className="text-[11px] text-muted-foreground">{t("hr.payroll.worked.otherMonths", { count: others.length })}</span>
              )}
            </span>
            {row.worked_confirmed_by_name && (
              <span className="hidden max-w-full truncate text-[11px] text-muted-foreground @3xl:block">
                {t("hr.payroll.worked.confirmedBy", { name: row.worked_confirmed_by_name })}
              </span>
            )}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "",
      width: locale === "ka" ? "170px" : "124px",
      align: "end",
      mobile: "actions",
      cell: (row) => (
        <button
          type="button"
          className={leaveButton.outlineSm}
          disabled={!row.rate_amount}
          title={!row.rate_amount ? t("hr.payroll.worked.needsRate") : undefined}
          onClick={() => openEdit(row)}
          data-testid="worked-edit"
        >
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
          {t("hr.payroll.worked.edit")}
        </button>
      ),
    },
  ]

  return (
    <>
      <SectionCard
        testId="payroll-worked"
        title={t("hr.payroll.worked.title", { period: periodLabel })}
        hint={t("hr.payroll.worked.description")}
      >
        <LeaveTable
          variant="flush"
          ariaLabel={t("hr.payroll.worked.title", { period: periodLabel })}
          testId="worked-table"
          rowTestId="worked-row"
          columns={columns}
          rows={loading ? undefined : rows}
          rowKey={(row) => row.id}
          error={loadError}
          onRetry={load}
          skeletonRows={4}
          empty={<LeaveEmptyState icon={CalendarCheck} title={t("hr.payroll.worked.empty")} />}
        />
      </SectionCard>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-base">{t("hr.payroll.worked.dialogTitle")}</DialogTitle>
            <DialogDescription className="text-[13px]">
              {editing &&
                t("hr.payroll.worked.dialogDescription", {
                  substitute: editing.substitute_name,
                  employee: editing.employee_name,
                })}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4">
              {dayGroups.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">{t("hr.payroll.worked.noWorkable")}</p>
              ) : (
                dayGroups.map((group) => (
                  <section key={group.period} className="grid gap-2" data-testid="worked-month">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[13px] font-semibold">{formatPeriod(group.period, locale)}</h4>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className={cn(leaveButton.ghostIconSm, "w-auto px-2 text-xs font-normal")}
                          onClick={() =>
                            setSelected((prev) =>
                              [...new Set([...prev, ...group.days.filter((d) => workable.has(d))])].sort()
                            )
                          }
                        >
                          {t("hr.payroll.worked.selectAll")}
                        </button>
                        <button
                          type="button"
                          className={cn(leaveButton.ghostIconSm, "w-auto px-2 text-xs font-normal")}
                          onClick={() =>
                            setSelected((prev) => prev.filter((d) => !group.days.includes(d) || !workable.has(d)))
                          }
                        >
                          {t("hr.payroll.worked.clear")}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                      {group.days.map((d) => {
                        const canEdit = workable.has(d)
                        const checked = selected.includes(d)
                        return (
                          <label
                            key={d}
                            className={cn(
                              "flex h-[34px] items-center gap-2 rounded-md border px-2 text-[13px] tabular-nums transition-colors",
                              canEdit ? "cursor-pointer hover:bg-muted/50" : "opacity-60",
                              checked && "border-primary/40 bg-primary/5"
                            )}
                            title={!canEdit ? t("hr.payroll.worked.notWorkable") : formatLeaveDate(d, locale, { year: "always" })}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={!canEdit}
                              onCheckedChange={() => setSelected((prev) => toggleDay(prev, d))}
                            />
                            {fmtDay(d)}
                          </label>
                        )
                      })}
                    </div>
                  </section>
                ))
              )}
              <p className="text-xs text-muted-foreground tabular-nums">
                {t("hr.payroll.worked.selectedDays", { count: selected.length })}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <button type="button" className={leaveButton.outline} onClick={() => setEditing(null)}>
              {t("hr.common.cancel")}
            </button>
            <button
              type="button"
              className={leaveButton.primary}
              onClick={handleSave}
              disabled={saving || !editing || sameDays(selected, editing.worked_days)}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {t("hr.common.save")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
