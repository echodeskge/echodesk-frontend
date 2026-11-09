"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Lock, ReceiptText } from "lucide-react"
import { cn, getApiErrorMessage } from "@/lib/utils"
import { FeatureGate } from "../_components/FeatureGate"
import { MonthPicker } from "../_components/MonthPicker"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { fetchMyPayroll, type MyPayroll } from "../_lib/hr-api"
import { currentPeriod, formatMoney, formatPeriod } from "../_lib/hr-utils"
import { dayCount, formatOtherCurrencies, payrollMoneyColumns } from "../_lib/payroll-utils"
import {
  LeaveEmptyState,
  LeaveErrorState,
  LeaveLoading,
  LeavePage,
  LeavePageHeader,
  LeaveTable,
  PersonCell,
  SectionCard,
  StatGrid,
  TonePill,
  type LeaveColumn,
  type StatItem,
} from "../_components/ui"
import { MoneyCell } from "../payroll/_components/money"

type Substitution = MyPayroll["substitutions"][number] & { _key: string }

export default function MyPayrollPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const { loaded, features } = useLeaveFeatures()
  const allowed = Boolean(features?.payroll_self_view)
  const [period, setPeriod] = useState(currentPeriod())
  const [data, setData] = useState<MyPayroll | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setData(await fetchMyPayroll(period))
    } catch (error) {
      setData(null)
      setLoadError(error)
      toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setLoading(false)
    }
  }, [period, t])

  useEffect(() => {
    if (allowed) load()
  }, [allowed, load])

  const money = (v: string | null | undefined) => formatMoney(v, locale)
  const row = data?.row ?? null
  const other = row ? formatOtherCurrencies(row.other_currency_substitution_pay, money) : ""
  const mode = data?.mode ?? "gross"
  const headline = mode === "net" ? "net" : "gross"
  const periodLabel = formatPeriod(period, locale)
  /** Stat value: the amount with the currency as a small muted suffix (keeps 24px values on one line at 390). */
  const withCurrency = (v: string | null | undefined) => {
    const amount = money(v)
    if (amount === "—" || !row?.currency) return amount
    return (
      <>
        {amount}
        <span className="ms-1 text-xs font-normal tracking-normal text-muted-foreground">{row.currency}</span>
      </>
    )
  }

  const stats: StatItem[] = row
    ? [
        {
          key: headline,
          label: t(`hr.payroll.columns.${headline}`),
          value: withCurrency(row[headline]),
          hint: data?.locked ? t("hr.payroll.report.lockedBadge") : t("hr.payroll.report.draftBadge"),
          hintTone: data?.locked ? "success" : "muted",
          testId: "my-payroll-headline",
        },
        { key: "salary", label: t("hr.payroll.columns.monthly_salary"), value: withCurrency(row.monthly_salary) },
        {
          key: "worked",
          label: t("hr.payroll.columns.worked_to_date"),
          value: String(row.worked_to_date),
          hint: t("hr.payroll.my.ofScheduled", { count: row.scheduled_days }),
        },
        {
          key: "substitution",
          label: t("hr.payroll.columns.substitution_pay"),
          value: withCurrency(row.substitution_pay),
          hint: other ? `+ ${other}` : undefined,
        },
      ]
    : []

  const breakdown: { key: string; label: string; value: React.ReactNode; strong?: boolean; hint?: string }[] = row
    ? [
        { key: "monthly_salary", label: t("hr.payroll.columns.monthly_salary"), value: <MoneyCell amount={money(row.monthly_salary)} currency={row.currency} /> },
        { key: "scheduled_days", label: t("hr.payroll.columns.scheduled_days"), value: String(row.scheduled_days) },
        { key: "worked_to_date", label: t("hr.payroll.columns.worked_to_date"), value: String(row.worked_to_date) },
        { key: "paid_leave_days", label: t("hr.payroll.columns.paid_leave_days"), value: String(row.paid_leave_days) },
        { key: "unpaid_days", label: t("hr.payroll.columns.unpaid_days"), value: String(row.unpaid_days) },
        ...payrollMoneyColumns(mode).map((c) => ({
          key: c,
          label: t(`hr.payroll.columns.${c}`),
          value: <MoneyCell amount={money(row[c])} currency={row.currency} strong={c === "gross" || c === "net"} />,
          strong: c === "gross" || c === "net",
          hint: c === "substitution_pay" && other ? `+ ${other}` : undefined,
        })),
      ]
    : []

  const subColumns: LeaveColumn<Substitution>[] = [
    {
      id: "employee",
      header: t("hr.payroll.worked.coveringFor"),
      width: "minmax(150px,1fr)",
      mobile: "title",
      cell: (s) => <PersonCell name={s.employee_name} />,
    },
    {
      id: "task",
      header: t("hr.payroll.rates.task"),
      width: "minmax(0,1.6fr)",
      mobile: "meta",
      muted: true,
      cell: (s) => (
        <span className="truncate" title={s.task}>
          {s.task}
        </span>
      ),
    },
    {
      id: "days",
      header: t("hr.payroll.worked.daysWorked"),
      width: "96px",
      align: "end",
      mobile: "meta",
      cell: (s) => (
        <span className="font-mono text-xs tabular-nums">
          <span className="me-1 font-sans text-muted-foreground @3xl:hidden">{t("hr.payroll.worked.daysWorked")}</span>
          {dayCount(s.days)}
        </span>
      ),
    },
    {
      id: "amount",
      header: t("hr.payroll.my.amount"),
      width: "140px",
      align: "end",
      mobile: "end",
      cell: (s) => <MoneyCell amount={money(s.amount)} currency={s.currency} strong />,
    },
  ]

  return (
    <FeatureGate loaded={loaded} allowed={allowed}>
      <LeavePage width="medium" testId="my-payroll-page">
        <LeavePageHeader
          icon={ReceiptText}
          title={t("hr.payroll.my.title")}
          description={t("hr.payroll.my.description")}
          action={<MonthPicker value={period} onChange={setPeriod} />}
        />

        {loading ? (
          <>
            <StatGrid
              loading
              items={["a", "b", "c", "d"].map((key) => ({ key, label: "", value: null }))}
            />
            <LeaveLoading />
          </>
        ) : loadError ? (
          <SectionCard title={periodLabel}>
            <LeaveErrorState error={loadError} onRetry={load} />
          </SectionCard>
        ) : !row ? (
          <SectionCard title={periodLabel} hint={data?.locked ? t("hr.payroll.my.final") : t("hr.payroll.my.preliminary")}>
            <LeaveEmptyState icon={ReceiptText} title={t("hr.payroll.my.noRow")} testId="my-payroll-empty" />
          </SectionCard>
        ) : (
          <>
            <StatGrid items={stats} testId="my-payroll-stats" />

            <SectionCard
              testId="my-payroll-breakdown"
              title={t("hr.payroll.my.breakdown")}
              hint={data?.locked ? t("hr.payroll.my.final") : t("hr.payroll.my.preliminary")}
              actions={
                data?.locked ? (
                  <TonePill tone="success">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" aria-hidden />
                      {t("hr.payroll.report.lockedBadge")}
                    </span>
                  </TonePill>
                ) : (
                  <TonePill tone="neutral">{t("hr.payroll.report.draftBadge")}</TonePill>
                )
              }
            >
              <dl className="grid sm:grid-cols-2">
                {breakdown.map((item) => (
                  <div
                    key={item.key}
                    className={cn(
                      "flex min-h-10 items-baseline justify-between gap-4 border-b px-4 py-2.5 text-[13px] sm:odd:border-e",
                      item.strong && "bg-muted/30"
                    )}
                  >
                    <dt className={cn("min-w-0 text-muted-foreground", item.strong && "font-medium text-foreground")}>{item.label}</dt>
                    <dd className="flex flex-col items-end text-end tabular-nums">
                      {typeof item.value === "string" ? <span className="font-mono text-xs">{item.value}</span> : item.value}
                      {item.hint && <span className="text-[11px] text-muted-foreground">{item.hint}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          </>
        )}

        {!loading && data && data.substitutions.length > 0 && (
          <SectionCard title={t("hr.payroll.my.substitutionsTitle")} hint={t("hr.payroll.my.substitutionsDescription")}>
            <LeaveTable
              variant="flush"
              ariaLabel={t("hr.payroll.my.substitutionsTitle")}
              testId="my-payroll-substitutions"
              columns={subColumns}
              rows={data.substitutions.map((s, i) => ({ ...s, _key: `${s.leave_request}-${i}` }))}
              rowKey={(s) => s._key}
            />
          </SectionCard>
        )}
      </LeavePage>
    </FeatureGate>
  )
}
