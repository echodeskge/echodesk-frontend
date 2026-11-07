"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, Lock } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FeatureGate } from "../_components/FeatureGate"
import { MonthPicker } from "../_components/MonthPicker"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { fetchMyPayroll, type MyPayroll } from "../_lib/hr-api"
import { currentPeriod, formatMoney, formatPeriod } from "../_lib/hr-utils"
import { dayCount, formatOtherCurrencies, payrollMoneyColumns } from "../_lib/payroll-utils"

export default function MyPayrollPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const { loaded, features } = useLeaveFeatures()
  const allowed = Boolean(features?.payroll_self_view)
  const [period, setPeriod] = useState(currentPeriod())
  const [data, setData] = useState<MyPayroll | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await fetchMyPayroll(period))
    } catch (error) {
      setData(null)
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

  return (
    <FeatureGate loaded={loaded} allowed={allowed}>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("hr.payroll.my.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("hr.payroll.my.description")}</p>
          </div>
          <MonthPicker value={period} onChange={setPeriod} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>{formatPeriod(period, locale)}</CardTitle>
                  <CardDescription>
                    {data?.locked ? t("hr.payroll.my.final") : t("hr.payroll.my.preliminary")}
                  </CardDescription>
                </div>
                {data?.locked && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    {t("hr.payroll.report.lockedBadge")}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {!row ? (
                  <p className="text-center text-muted-foreground py-8">{t("hr.payroll.my.noRow")}</p>
                ) : (
                  <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    <Item label={t("hr.payroll.columns.monthly_salary")} value={`${money(row.monthly_salary)} ${row.currency}`} />
                    <Item label={t("hr.payroll.columns.scheduled_days")} value={String(row.scheduled_days)} />
                    <Item label={t("hr.payroll.columns.worked_to_date")} value={String(row.worked_to_date)} />
                    <Item label={t("hr.payroll.columns.paid_leave_days")} value={String(row.paid_leave_days)} />
                    <Item label={t("hr.payroll.columns.unpaid_days")} value={String(row.unpaid_days)} />
                    {payrollMoneyColumns(data?.mode ?? "gross").map((c) => (
                      <Item
                        key={c}
                        label={t(`hr.payroll.columns.${c}`)}
                        value={`${money(row[c])} ${row.currency}`}
                        strong={c === "gross" || c === "net"}
                        hint={c === "substitution_pay" && other ? `+ ${other}` : undefined}
                      />
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>

            {data && data.substitutions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("hr.payroll.my.substitutionsTitle")}</CardTitle>
                  <CardDescription>{t("hr.payroll.my.substitutionsDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("hr.payroll.worked.coveringFor")}</TableHead>
                          <TableHead>{t("hr.payroll.rates.task")}</TableHead>
                          <TableHead className="text-right">{t("hr.payroll.worked.daysWorked")}</TableHead>
                          <TableHead className="text-right">{t("hr.payroll.my.amount")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.substitutions.map((s, i) => (
                          <TableRow key={`${s.leave_request}-${i}`}>
                            <TableCell className="font-medium">{s.employee_name}</TableCell>
                            <TableCell className="max-w-[320px] whitespace-normal">{s.task}</TableCell>
                            <TableCell className="text-right">
                              {dayCount(s.days)}
                            </TableCell>
                            <TableCell className="text-right">
                              {money(s.amount)} {s.currency}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </FeatureGate>
  )
}

function Item({ label, value, strong, hint }: { label: string; value: string; strong?: boolean; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b pb-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-right ${strong ? "font-semibold text-lg" : ""}`}>
        {value}
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </dd>
    </div>
  )
}
