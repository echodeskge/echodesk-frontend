"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Download, FileSpreadsheet, Loader2, Lock, LockOpen } from "lucide-react"
import { cn, getApiErrorMessage } from "@/lib/utils"
import { downloadBlob } from "@/lib/downloadBlob"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/app/(tenant)/tickets/_lib/format"
import {
  fetchPayrollCsv,
  fetchPayrollReport,
  fetchPayrollRuns,
  lockPayrollMonth,
  unlockPayrollRun,
  type PayrollReport,
  type PayrollRow,
  type PayrollRun,
  type PayrollTotals,
} from "../../_lib/hr-api"
import { formatMoney, formatPeriod } from "../../_lib/hr-utils"
import {
  findRunForPeriod,
  formatOtherCurrencies,
  payrollMoneyColumns,
  totalsRows,
  type PayrollMoneyKey,
} from "../../_lib/payroll-utils"
import {
  LeaveEmptyState,
  LeaveTable,
  PersonCell,
  SectionCard,
  TonePill,
  leaveButton,
  type LeaveColumn,
} from "../../_components/ui"
import { MoneyCell } from "./money"

type ReportLine =
  | { kind: "row"; key: string; row: PayrollRow }
  | { kind: "total"; key: string; total: PayrollTotals & { currency: string } }

const DAY_COLUMNS = ["scheduled_days", "worked_to_date", "paid_leave_days", "unpaid_days"] as const

export function ReportTab({ isStaff, period }: { isStaff: boolean; period: string }) {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [report, setReport] = useState<PayrollReport | null>(null)
  const [run, setRun] = useState<PayrollRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [busy, setBusy] = useState<"lock" | "unlock" | "export" | null>(null)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [unlockReason, setUnlockReason] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
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
      setLoadError(error)
      toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setLoading(false)
    }
  }, [period, t])

  useEffect(() => {
    load()
  }, [load])

  const periodLabel = formatPeriod(period, locale)

  const handleLock = async () => {
    if (!confirm(t("hr.payroll.report.confirmLock", { period: periodLabel }))) return
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
  const moneyKeys = payrollMoneyColumns(report?.mode ?? "gross")
  const isNet = report?.mode === "net"
  const locked = Boolean(report?.locked)
  const headline: PayrollMoneyKey = isNet ? "net" : "gross"

  const lines: ReportLine[] | undefined = loading
    ? undefined
    : report
      ? [
          ...report.rows.map((row) => ({ kind: "row" as const, key: `u${row.user}`, row })),
          ...(report.rows.length > 0
            ? totalsRows(report.totals).map((total) => ({ kind: "total" as const, key: `t-${total.currency}`, total }))
            : []),
        ]
      : []

  const headerCell = (label: string) => <span title={label} className="truncate">{label}</span>
  /** Mobile-only label before a figure (the desktop grid has column headers). */
  const mobileLabel = (label: string) => <span className="me-1 text-muted-foreground @3xl:hidden">{label}</span>

  const columns: LeaveColumn<ReportLine>[] = [
    {
      id: "employee",
      header: t("hr.payroll.columns.employee"),
      width: "minmax(150px,1.4fr)",
      mobile: "title",
      cell: (l) =>
        l.kind === "row" ? (
          <PersonCell name={l.row.name} sub={l.row.job_title || l.row.email} />
        ) : (
          <span className="truncate font-semibold">{t("hr.payroll.report.totalIn", { currency: l.total.currency })}</span>
        ),
    },
    {
      id: "monthly_salary",
      header: headerCell(t("hr.payroll.columns.monthly_salary")),
      width: "112px",
      align: "end",
      mobile: "meta",
      cell: (l) =>
        l.kind === "row" ? (
          <>
            {mobileLabel(t("hr.payroll.columns.monthly_salary"))}
            <MoneyCell amount={money(l.row.monthly_salary)} currency={l.row.currency} />
          </>
        ) : null,
      className: "empty:hidden @3xl:empty:flex",
    },
    ...DAY_COLUMNS.map(
      (key): LeaveColumn<ReportLine> => ({
        id: key,
        header: headerCell(t(`hr.payroll.columns.${key}`)),
        width: "84px",
        align: "end",
        mobile: key === "scheduled_days" || key === "worked_to_date" ? "meta" : "hidden",
        cell: (l) =>
          l.kind === "row" ? (
            <>
              {mobileLabel(t(`hr.payroll.columns.${key}`))}
              <span className="font-mono text-xs tabular-nums">{String(l.row[key])}</span>
            </>
          ) : null,
        className: "empty:hidden @3xl:empty:flex",
      })
    ),
    ...moneyKeys.map(
      (key): LeaveColumn<ReportLine> => ({
        id: key,
        header: headerCell(t(`hr.payroll.columns.${key}`)),
        width: "120px",
        align: "end",
        mobile: key === headline ? "end" : key === "substitution_pay" ? "meta" : "hidden",
        cell: (l) => {
          if (l.kind === "total") {
            return (
              <span className="flex items-baseline">
                {key !== headline && mobileLabel(t(`hr.payroll.columns.${key}`))}
                <MoneyCell amount={money(l.total[key])} currency={l.total.currency} strong />
              </span>
            )
          }
          const other = key === "substitution_pay" ? formatOtherCurrencies(l.row.other_currency_substitution_pay, money) : ""
          return (
            <span className="flex flex-col items-end" title={other ? `+ ${other}` : undefined}>
              <span className="flex items-baseline">
                {key !== headline && mobileLabel(t(`hr.payroll.columns.${key}`))}
                <MoneyCell amount={money(l.row[key])} currency={l.row.currency} strong={key === "gross" || key === "net"} />
              </span>
              {other && <span className="max-w-full truncate text-[11px] text-muted-foreground">+ {other}</span>}
            </span>
          )
        },
      })
    ),
  ]

  const summary = report
    ? isNet
      ? t("hr.payroll.report.netSummary", {
          days: report.working_days,
          tax: report.income_tax_rate,
          pension: report.pension_rate,
        })
      : t("hr.payroll.report.grossSummary", { days: report.working_days })
    : null
  const lockedAt =
    locked && report?.locked_at ? t("hr.payroll.report.lockedAt", { date: formatDateTime(report.locked_at, locale) }) : null

  return (
    <>
      <SectionCard
        testId="payroll-report"
        title={t("hr.payroll.report.title", { period: periodLabel })}
        hint={summary ? [summary, lockedAt].filter(Boolean).join(" · ") : undefined}
        actions={
          <>
            {!loading && report && (
              locked ? (
                <TonePill tone="success" testId="payroll-locked-pill">
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" aria-hidden />
                    {t("hr.payroll.report.lockedBadge")}
                  </span>
                </TonePill>
              ) : (
                <TonePill tone="neutral" testId="payroll-draft-pill">
                  {t("hr.payroll.report.draftBadge")}
                </TonePill>
              )
            )}
            {!locked && (
              <button
                type="button"
                className={leaveButton.outlineSm}
                onClick={handleLock}
                disabled={busy !== null || loading || !report}
                data-testid="payroll-lock"
              >
                {busy === "lock" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Lock className="h-3.5 w-3.5" aria-hidden />}
                {t("hr.payroll.report.lockMonth")}
              </button>
            )}
            {locked && isStaff && run && (
              <button
                type="button"
                className={leaveButton.outlineSm}
                onClick={() => setUnlockOpen(true)}
                disabled={busy !== null}
                data-testid="payroll-unlock"
              >
                <LockOpen className="h-3.5 w-3.5" aria-hidden />
                {t("hr.payroll.report.unlock")}
              </button>
            )}
            <button
              type="button"
              className={leaveButton.primarySm}
              onClick={handleExport}
              disabled={busy !== null || loading || !report}
              data-testid="payroll-export"
            >
              {busy === "export" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}
              {t("hr.payroll.report.downloadCsv")}
            </button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <LeaveTable
            variant="flush"
            className={cn(isNet ? "md:min-w-[1470px]" : "md:min-w-[1100px]")}
            ariaLabel={t("hr.payroll.report.title", { period: periodLabel })}
            testId="payroll-report-table"
            rowTestId="payroll-report-row"
            columns={columns}
            rows={lines}
            rowKey={(l) => l.key}
            rowClassName={(l) => (l.kind === "total" ? "bg-muted/40 font-semibold" : undefined)}
            error={loadError}
            onRetry={load}
            skeletonRows={4}
            empty={<LeaveEmptyState icon={FileSpreadsheet} title={t("hr.payroll.report.empty")} />}
            footer={
              report && report.rows.length > 0 ? (
                <span>{t("hr.common.employeesCount", { count: report.rows.length })}</span>
              ) : undefined
            }
          />
        </div>
      </SectionCard>

      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-base">{t("hr.payroll.report.unlockTitle")}</DialogTitle>
            <DialogDescription className="text-[13px]">
              {t("hr.payroll.report.unlockDescription", { period: periodLabel })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor="unlock-reason" className="text-[13px] font-medium">
              {t("hr.payroll.report.unlockReason")}
            </label>
            <Textarea
              id="unlock-reason"
              className="text-[13px]"
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <button type="button" className={leaveButton.outline} onClick={() => setUnlockOpen(false)}>
              {t("hr.common.cancel")}
            </button>
            <button
              type="button"
              className={leaveButton.primary}
              onClick={handleUnlock}
              disabled={!unlockReason.trim() || busy === "unlock"}
            >
              {busy === "unlock" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {t("hr.payroll.report.unlock")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
