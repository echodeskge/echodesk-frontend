"use client"

import { useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import axios from "@/api/axios"
import { getApiErrorMessage } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Calendar, Loader2, TrendingUp, TrendingDown } from "lucide-react"

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

const toNumber = (value: string | number | null | undefined) => {
  const parsed = parseFloat(String(value ?? ""))
  return Number.isFinite(parsed) ? parsed : 0
}

export default function MyBalancePage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [currentYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchBalances()
  }, [])

  const fetchBalances = async () => {
    try {
      // Direct call: the generated list function has no `year` / `lang` params.
      const response = await axios.get("/api/leave/employee/my-balance/", {
        params: { year: currentYear, lang: locale, page_size: 100 },
      })
      setBalances(unwrapList<LeaveBalance>(response.data))
    } catch (error) {
      console.error("Failed to fetch balances:", error)
      setBalances([])
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const calculatePercentage = (used: string, total: string) => {
    const usedNum = toNumber(used)
    const totalNum = toNumber(total)
    if (totalNum <= 0) return 0
    return Math.min(100, Math.round((usedNum / totalNum) * 100))
  }

  const getTotalStats = () => {
    const total = balances.reduce(
      (acc, balance) => {
        // Allocation for the year includes days carried forward.
        acc.allocated += toNumber(balance.total_allocated)
        acc.used += toNumber(balance.used_days)
        acc.pending += toNumber(balance.pending_days)
        acc.remaining += toNumber(balance.available_days)
        return acc
      },
      { allocated: 0, used: 0, pending: 0, remaining: 0 }
    )
    return total
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const totalStats = getTotalStats()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("myBalance.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("myBalance.description", { year: String(currentYear) })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("myBalance.totalAllocated")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.allocated.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">{t("myBalance.daysAllocatedThisYear")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("shared.used")}</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.used.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">{t("myBalance.daysTakenSoFar")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("shared.status.pending")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.pending.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">{t("myBalance.daysInPendingRequests")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("myBalance.remaining")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.remaining.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">{t("myBalance.daysAvailable")}</p>
          </CardContent>
        </Card>
      </div>

      {balances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("myBalance.noBalanceTitle")}</h3>
            <p className="text-muted-foreground text-center">
              {t("myBalance.noBalanceLine1")}
              <br />
              {t("myBalance.noBalanceLine2")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {balances.map((balance) => {
            const percentage = calculatePercentage(
              balance.used_days,
              balance.total_allocated
            )
            const remaining = toNumber(balance.available_days)

            return (
              <Card key={balance.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{balance.leave_type_name}</CardTitle>
                      <CardDescription>{balance.leave_type_code}</CardDescription>
                    </div>
                    <Badge
                      variant={remaining > 0 ? "default" : "secondary"}
                      className="text-lg px-4 py-1"
                    >
                      {t("myBalance.daysLeft", { count: remaining.toFixed(1) })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t("myBalance.usage")}</span>
                      <span className="font-medium">
                        {t("myBalance.usageValue", { used: balance.used_days, allocated: balance.total_allocated })}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {t("myBalance.percentUsed", { percentage: String(percentage) })}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("myBalance.allocated")}</p>
                      <p className="text-lg font-semibold">
                        {balance.allocated_days}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("myBalance.carriedForward")}</p>
                      <p className="text-lg font-semibold">
                        {balance.carried_forward_days}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("shared.used")}</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {balance.used_days}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("shared.status.pending")}</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {balance.pending_days}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
