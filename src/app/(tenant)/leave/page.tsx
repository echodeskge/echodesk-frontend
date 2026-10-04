"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { toast } from "sonner"
import axios from "@/api/axios"
import { getApiErrorMessage } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarCheck, Clock, CheckCircle2, CalendarDays, Users, FileText } from "lucide-react"

// `null` = not loaded (still loading, failed, or not available to this user).
interface DashboardStats {
  myPendingRequests: number | null
  myApprovedThisYear: number | null
  myTotalBalance: number | null
  teamPendingRequests: number | null
  totalLeaveTypes: number | null
  upcomingHolidays: number | null
}

const EMPTY_STATS: DashboardStats = {
  myPendingRequests: null,
  myApprovedThisYear: null,
  myTotalBalance: null,
  teamPendingRequests: null,
  totalLeaveTypes: null,
  upcomingHolidays: null,
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

// Total rows of a list response: `count` when paginated, length otherwise.
function listCount(data: unknown): number {
  const count = (data as { count?: unknown } | null | undefined)?.count
  return typeof count === "number" ? count : unwrapList(data).length
}

const statusOf = (error: unknown) =>
  (error as { response?: { status?: number } } | null | undefined)?.response?.status

export default function LeaveDashboard() {
  const t = useTranslations("leave")
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  // Team card is only shown to users the manager endpoint accepts.
  const [showTeamCard, setShowTeamCard] = useState(false)

  useEffect(() => {
    let ignore = false

    const fetchStats = async () => {
      const today = new Date()
      const year = today.getFullYear()

      const [pending, approved, summary, teamPending, leaveTypes, holidays] =
        await Promise.allSettled([
          // My requests still awaiting a decision (count only).
          axios.get("/api/leave/employee/my-requests/pending/", { params: { page_size: 1 } }),
          // My approved requests; the API has no year filter, so filter below.
          axios.get("/api/leave/employee/my-requests/approved/", { params: { page_size: 100 } }),
          // Aggregated balance for the current year.
          axios.get("/api/leave/employee/my-balance/summary/"),
          // Team requests awaiting the manager (403 for non-managers).
          axios.get("/api/leave/manager/team-requests/pending/", { params: { page_size: 1 } }),
          // Active leave types.
          axios.get("/api/leave/employee/leave-types/", { params: { page_size: 1 } }),
          // Next holidays (API returns at most 10, current year only).
          axios.get("/api/leave/employee/holidays/upcoming/"),
        ])

      if (ignore) return

      const next: DashboardStats = { ...EMPTY_STATS }
      const failures: unknown[] = []

      if (pending.status === "fulfilled") {
        next.myPendingRequests = listCount(pending.value.data)
      } else failures.push(pending.reason)

      if (approved.status === "fulfilled") {
        next.myApprovedThisYear = unwrapList<{ start_date?: string }>(approved.value.data).filter(
          (request) => String(request.start_date || "").startsWith(`${year}-`)
        ).length
      } else failures.push(approved.reason)

      if (summary.status === "fulfilled") {
        const available = parseFloat(String(summary.value.data?.total_available ?? ""))
        next.myTotalBalance = Number.isFinite(available) ? available : 0
      } else failures.push(summary.reason)

      if (teamPending.status === "fulfilled") {
        next.teamPendingRequests = listCount(teamPending.value.data)
        setShowTeamCard(true)
      } else if (statusOf(teamPending.reason) === 403) {
        // Not a manager: expected, just leave the team card hidden.
        setShowTeamCard(false)
      } else {
        setShowTeamCard(true)
        failures.push(teamPending.reason)
      }

      if (leaveTypes.status === "fulfilled") {
        next.totalLeaveTypes = listCount(leaveTypes.value.data)
      } else failures.push(leaveTypes.reason)

      if (holidays.status === "fulfilled") {
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const end = new Date(start)
        end.setDate(end.getDate() + 30)
        next.upcomingHolidays = unwrapList<{ date?: string }>(holidays.value.data).filter(
          (holiday) => {
            if (!holiday.date) return false
            const date = new Date(`${holiday.date}T00:00:00`)
            return date >= start && date <= end
          }
        ).length
      } else failures.push(holidays.reason)

      setStats(next)

      if (failures.length > 0) {
        console.error("Failed to fetch leave dashboard stats:", failures)
        toast.error(t("shared.loadFailed"), {
          description: getApiErrorMessage(failures[0]) || undefined,
        })
      }
    }

    fetchStats()
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const display = (value: number | null, decimals = 0) =>
    value === null ? "—" : value.toFixed(decimals)

  const quickLinks = [
    {
      title: t("overview.links.myRequests.title"),
      description: t("overview.links.myRequests.description"),
      href: "/leave/my-requests",
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: t("overview.links.myBalance.title"),
      description: t("overview.links.myBalance.description"),
      href: "/leave/my-balance",
      icon: CalendarDays,
      color: "text-green-600",
    },
    {
      title: t("overview.links.teamRequests.title"),
      description: t("overview.links.teamRequests.description"),
      href: "/leave/team-requests",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: t("overview.links.allRequests.title"),
      description: t("overview.links.allRequests.description"),
      href: "/leave/all-requests",
      icon: CalendarCheck,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("overview.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("overview.description")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.pendingRequests")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{display(stats.myPendingRequests)}</div>
            <p className="text-xs text-muted-foreground">{t("overview.awaitingApproval")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.approvedLeaves")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{display(stats.myApprovedThisYear)}</div>
            <p className="text-xs text-muted-foreground">{t("overview.thisYear")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.leaveBalance")}</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{display(stats.myTotalBalance, 1)}</div>
            <p className="text-xs text-muted-foreground">{t("overview.daysRemaining")}</p>
          </CardContent>
        </Card>
      </div>

      <div className={`grid gap-4 ${showTeamCard ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {showTeamCard && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("overview.teamPending")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{display(stats.teamPendingRequests)}</div>
              <p className="text-xs text-muted-foreground">{t("overview.requireYourApproval")}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("overview.leaveTypes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{display(stats.totalLeaveTypes)}</div>
            <p className="text-xs text-muted-foreground">{t("overview.activeLeaveTypes")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("overview.upcomingHolidays")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{display(stats.upcomingHolidays)}</div>
            <p className="text-xs text-muted-foreground">{t("overview.next30Days")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("overview.quickActions")}</CardTitle>
          <CardDescription>{t("overview.quickActionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href}>
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardHeader className="flex flex-row items-center space-x-4 space-y-0">
                    <Icon className={`h-8 w-8 ${link.color}`} />
                    <div>
                      <CardTitle className="text-base">{link.title}</CardTitle>
                      <CardDescription>{link.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
