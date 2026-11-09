"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Calendar } from "lucide-react"
import axios from "@/api/axios"
import { getApiErrorMessage } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { balanceTotals, toNumber, usedPercent } from "../_lib/lv01-utils"
import {
  LeaveEmptyState,
  LeaveErrorState,
  LeaveHeaderBridge,
  LeavePage,
  SectionCard,
  StatGrid,
  TonePill,
  formatDays,
} from "../_components/ui"

// Shape of LeaveBalanceListSerializer: `leave_type` is an id, the name/code
// are flat fields and the remaining days are called `available_days`.
// All day counts are decimal strings.
interface LeaveBalance {
  id: number
  leave_type: number
  leave_type_name: string
  leave_type_code: string
  year: number
  allocated_days: string
  used_days: string
  carried_forward_days: string
  pending_days: string
  available_days: string
  total_allocated: string
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

export default function MyBalancePage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  // undefined = still loading.
  const [balances, setBalances] = useState<LeaveBalance[] | undefined>(undefined)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [currentYear] = useState(new Date().getFullYear())

  const fetchBalances = useCallback(async () => {
    try {
      // Direct call: the generated list function has no `year` / `lang` params.
      const response = await axios.get("/api/leave/employee/my-balance/", {
        params: { year: currentYear, lang: locale, page_size: 100 },
      })
      setBalances(unwrapList<LeaveBalance>(response.data))
      setLoadError(null)
    } catch (error) {
      console.error("Failed to fetch balances:", error)
      setBalances([])
      setLoadError(error)
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    }
  }, [currentYear, locale, t])

  useEffect(() => {
    fetchBalances()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loading = balances === undefined
  const totals = balanceTotals(balances ?? [])
  const value = (n: number) => (loading || loadError ? null : formatDays(n))

  return (
    <>
      <LeaveHeaderBridge sub={String(currentYear)} />
      <LeavePage width="medium" testId="my-balance-page">
        <StatGrid
          loading={loading}
          testId="my-balance-stats"
          items={[
            { key: "allocated", label: t("myBalance.totalAllocated"), value: value(totals.allocated), hint: t("myBalance.daysAllocatedThisYear") },
            { key: "used", label: t("shared.used"), value: value(totals.used), hint: t("myBalance.daysTakenSoFar") },
            { key: "pending", label: t("shared.status.pending"), value: value(totals.pending), hint: t("myBalance.daysInPendingRequests") },
            {
              key: "remaining",
              label: t("myBalance.remaining"),
              value: value(totals.remaining),
              hint: t("myBalance.daysAvailable"),
              hintTone: !loading && !loadError && totals.remaining > 0 ? "success" : "muted",
            },
          ]}
        />

        {loading ? (
          <div className="grid gap-4" aria-hidden data-testid="my-balance-skeleton">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-[10px] border bg-card">
                <div className="flex h-11 items-center border-b bg-muted/35 px-4">
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="grid gap-3 px-4 py-4">
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-8 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-[10px] border bg-card">
            <LeaveErrorState
              error={loadError}
              onRetry={() => {
                setBalances(undefined)
                setLoadError(null)
                fetchBalances()
              }}
            />
          </div>
        ) : balances.length === 0 ? (
          <div className="rounded-[10px] border bg-card">
            <LeaveEmptyState
              icon={Calendar}
              title={t("myBalance.noBalanceTitle")}
              description={`${t("myBalance.noBalanceLine1")} ${t("myBalance.noBalanceLine2")}`}
              testId="my-balance-empty"
            />
          </div>
        ) : (
          balances.map((balance) => <BalanceCard key={balance.id} balance={balance} />)
        )}
      </LeavePage>
    </>
  )
}

function BalanceCard({ balance }: { balance: LeaveBalance }) {
  const t = useTranslations("leave")
  const percentage = usedPercent(balance.used_days, balance.total_allocated)
  const remaining = toNumber(balance.available_days)
  const figures = [
    { key: "allocated", label: t("myBalance.allocated"), value: balance.allocated_days },
    { key: "carried", label: t("myBalance.carriedForward"), value: balance.carried_forward_days },
    { key: "used", label: t("shared.used"), value: balance.used_days },
    { key: "pending", label: t("shared.status.pending"), value: balance.pending_days },
  ]

  return (
    <SectionCard
      testId="balance-card"
      title={balance.leave_type_name}
      hint={<span className="font-mono text-[11px] uppercase">{balance.leave_type_code}</span>}
      actions={
        <TonePill tone={remaining > 0 ? "success" : "neutral"} testId="balance-remaining">
          {t("myBalance.daysLeft", { count: formatDays(remaining) })}
        </TonePill>
      }
      bodyClassName="grid gap-4 px-4 py-4"
    >
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">{t("myBalance.usage")}</span>
          <span className="tabular-nums">
            {t("myBalance.usageValue", {
              used: formatDays(balance.used_days),
              allocated: formatDays(balance.total_allocated),
            })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
            aria-label={t("myBalance.percentUsed", { percentage: String(percentage) })}
            className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
          </div>
          <span className="w-10 shrink-0 text-end font-mono text-[11px] tabular-nums text-muted-foreground">
            {percentage}%
          </span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3.5 sm:grid-cols-4">
        {figures.map((f) => (
          <div key={f.key} className="grid min-w-0 gap-0.5">
            <dt className="truncate text-xs text-muted-foreground">{f.label}</dt>
            <dd className="text-base font-semibold tabular-nums">{formatDays(f.value)}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  )
}
