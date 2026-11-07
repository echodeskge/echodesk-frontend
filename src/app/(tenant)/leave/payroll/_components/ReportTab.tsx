"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Download, Loader2, Lock, LockOpen } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { downloadBlob } from "@/lib/downloadBlob"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MonthPicker } from "../../_components/MonthPicker"
import {
  fetchPayrollCsv,
  fetchPayrollReport,
  fetchPayrollRuns,
  lockPayrollMonth,
  unlockPayrollRun,
  type PayrollReport,
  type PayrollRun,
} from "../../_lib/hr-api"
import { currentPeriod, formatMoney, formatPeriod } from "../../_lib/hr-utils"
import {
  findRunForPeriod,
  formatOtherCurrencies,
  payrollMoneyColumns,
  totalsRows,
} from "../../_lib/payroll-utils"

export function ReportTab({ isStaff }: { isStaff: boolean }) {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [period, setPeriod] = useState(currentPeriod())
  const [report, setReport] = useState<PayrollReport | null>(null)
  const [run, setRun] = useState<PayrollRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"lock" | "unlock" | "export" | null>(null)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [unlockReason, setUnlockReason] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rep, runs] = await Promise.all([
        fetchPayrollReport(period),
        fetchPayrollRuns().catch(() => [] as PayrollRun[]),
      ])
      setReport(rep)
      setRun(findRunForPeriod(runs, period))
    } catch (error) {
      setReport(null)
      setRun(null)
      toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setLoading(false)
    }
  }, [period, t])

  useEffect(() => {
    load()
  }, [load])

  const handleLock = async () => {
    if (!confirm(t("hr.payroll.report.confirmLock", { period: formatPeriod(period, locale) }))) return
    setBusy("lock")
    try {
      await lockPayrollMonth(period)
      toast.success(t("hr.payroll.report.locked"))
      await load()
    } catch (error) {
      toast.error(t("hr.payroll.report.lockFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setBusy(null)
    }
  }

  const handleUnlock = async () => {
    if (!run || !unlockReason.trim()) return
    setBusy("unlock")
    try {
      await unlockPayrollRun(run.id, unlockReason.trim())
      toast.success(t("hr.payroll.report.unlocked"))
      setUnlockOpen(false)
      setUnlockReason("")
      await load()
    } catch (error) {
      toast.error(t("hr.payroll.report.unlockFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setBusy(null)
    }
  }

  const handleExport = async () => {
    setBusy("export")
    try {
      const { blob, filename } = await fetchPayrollCsv(period, locale === "ka" ? "ka" : "en")
      downloadBlob(blob, filename)
    } catch (error) {
      toast.error(t("hr.payroll.report.exportFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setBusy(null)
    }
  }

  const money = (v: string | null | undefined) => formatMoney(v, locale)
  const columns = payrollMoneyColumns(report?.mode ?? "gross")
  const locked = Boolean(report?.locked)
  const totals = totalsRows(report?.totals)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={period} onChange={setPeriod} />
        <div className="flex flex-wrap items-center gap-2">
          {locked ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              {t("hr.payroll.report.lockedBadge")}
            </Badge>
          ) : (
            <Badge variant="outline">{t("hr.payroll.report.draftBadge")}</Badge>
          )}
          {!locked && (
            <Button variant="outline" onClick={handleLock} disabled={busy !== null || loading || !report}>
              {busy === "lock" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              {t("hr.payroll.report.lockMonth")}
            </Button>
          )}
          {locked && isStaff && run && (
            <Button variant="outline" onClick={() => setUnlockOpen(true)} disabled={busy !== null}>
              <LockOpen className="h-4 w-4 mr-2" />
              {t("hr.payroll.report.unlock")}
            </Button>
          )}
          <Button onClick={handleExport} disabled={busy !== null || loading || !report}>
            {busy === "export" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {t("hr.payroll.report.downloadCsv")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("hr.payroll.report.title", { period: formatPeriod(period, locale) })}</CardTitle>
          {report && (
            <CardDescription>
              {report.mode === "net"
                ? t("hr.payroll.report.netSummary", {
                    days: report.working_days,
                    tax: report.income_tax_rate,
                    pension: report.pension_rate,
                  })
                : t("hr.payroll.report.grossSummary", { days: report.working_days })}
              {locked && report.locked_at && (
                <> · {t("hr.payroll.report.lockedAt", { date: new Date(report.locked_at).toLocaleString() })}</>
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !report || report.rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t("hr.payroll.report.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("hr.payroll.columns.employee")}</TableHead>
                    <TableHead className="text-right">{t("hr.payroll.columns.monthly_salary")}</TableHead>
                    <TableHead className="text-right">{t("hr.payroll.columns.scheduled_days")}</TableHead>
                    <TableHead className="text-right">{t("hr.payroll.columns.worked_to_date")}</TableHead>
                    <TableHead className="text-right">{t("hr.payroll.columns.paid_leave_days")}</TableHead>
                    <TableHead className="text-right">{t("hr.payroll.columns.unpaid_days")}</TableHead>
                    {columns.map((c) => (
                      <TableHead key={c} className="text-right">
                        {t(`hr.payroll.columns.${c}`)}
                      </TableHead>
                    ))}
                    <TableHead>{t("hr.payroll.columns.currency")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row) => {
                    const other = formatOtherCurrencies(row.other_currency_substitution_pay, money)
                    return (
                      <TableRow key={row.user}>
                        <TableCell>
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-muted-foreground">{row.job_title || row.email}</div>
                        </TableCell>
                        <TableCell className="text-right">{money(row.monthly_salary)}</TableCell>
                        <TableCell className="text-right">{row.scheduled_days}</TableCell>
                        <TableCell className="text-right">{row.worked_to_date}</TableCell>
                        <TableCell className="text-right">{row.paid_leave_days}</TableCell>
                        <TableCell className="text-right">{row.unpaid_days}</TableCell>
                        {columns.map((c) => (
                          <TableCell key={c} className={`text-right ${c === "gross" || c === "net" ? "font-semibold" : ""}`}>
                            {money(row[c])}
                            {c === "substitution_pay" && other && (
                              <div className="text-xs text-muted-foreground">+ {other}</div>
                            )}
                          </TableCell>
                        ))}
                        <TableCell>{row.currency}</TableCell>
                      </TableRow>
                    )
                  })}
                  {totals.map((tot) => (
                    <TableRow key={`total-${tot.currency}`} className="bg-muted/50 font-semibold">
                      <TableCell colSpan={6}>{t("hr.payroll.report.totalIn", { currency: tot.currency })}</TableCell>
                      {columns.map((c) => (
                        <TableCell key={c} className="text-right">
                          {money(tot[c])}
                        </TableCell>
                      ))}
                      <TableCell>{tot.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{t("hr.payroll.report.unlockTitle")}</DialogTitle>
            <DialogDescription>
              {t("hr.payroll.report.unlockDescription", { period: formatPeriod(period, locale) })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="unlock-reason">{t("hr.payroll.report.unlockReason")}</Label>
            <Textarea
              id="unlock-reason"
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockOpen(false)}>
              {t("hr.common.cancel")}
            </Button>
            <Button onClick={handleUnlock} disabled={!unlockReason.trim() || busy === "unlock"}>
              {busy === "unlock" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("hr.payroll.report.unlock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
