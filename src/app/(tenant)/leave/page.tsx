"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import axios from "@/api/axios"
import { getApiErrorMessage } from "@/lib/utils"
import { CalendarCheck, CalendarDays, ChevronRight, FileText, Handshake, Plus, Users, type LucideIcon } from "lucide-react"
import { useLeaveFeatures } from "./_lib/useLeaveFeatures"
import { countHolidaysWithin30Days, countStartingInYear } from "./_lib/lv01-utils"
import {
  LeaveBanner,
  LeaveHeaderBridge,
  LeavePage,
  SectionCard,
  StatGrid,
  formatDays,
  leaveButton,
  type StatItem,
} from "./_components/ui"
// Loaded on first open: the dialog (form, substitutes editor, user list) is
// most of this page's JavaScript and most visits never open it.
const NewRequestDialog = dynamic(
  () => import("./my-requests/_components/new-request-dialog").then((m) => m.NewRequestDialog),
  { ssr: false }
)

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
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [loaded, setLoaded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  // Mount the dialog only once it has been opened (it then stays mounted for the close animation).
  const [dialogMounted, setDialogMounted] = useState(false)
  if (isDialogOpen && !dialogMounted) setDialogMounted(true)
  // Team tile is only shown to users the manager endpoint accepts.
  const [showTeamCard, setShowTeamCard] = useState(false)
  const { features } = useLeaveFeatures()
  const awaitingMyConsent = features?.substitutes ? features.pending_substitute_count : 0

  const fetchStats = useCallback(async (isIgnored: () => boolean = () => false) => {
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

    if (isIgnored()) return

    const next: DashboardStats = { ...EMPTY_STATS }
    const failures: unknown[] = []

    if (pending.status === "fulfilled") {
      next.myPendingRequests = listCount(pending.value.data)
    } else failures.push(pending.reason)

    if (approved.status === "fulfilled") {
      next.myApprovedThisYear = countStartingInYear(
        unwrapList<{ start_date?: string }>(approved.value.data),
        year
      )
    } else failures.push(approved.reason)

    if (summary.status === "fulfilled") {
      const available = parseFloat(String(summary.value.data?.total_available ?? ""))
      next.myTotalBalance = Number.isFinite(available) ? available : 0
    } else failures.push(summary.reason)

    if (teamPending.status === "fulfilled") {
      next.teamPendingRequests = listCount(teamPending.value.data)
      setShowTeamCard(true)
    } else if (statusOf(teamPending.reason) === 403) {
      // Not a manager: expected, just leave the team tile hidden.
      setShowTeamCard(false)
    } else {
      setShowTeamCard(true)
      failures.push(teamPending.reason)
    }

    if (leaveTypes.status === "fulfilled") {
      next.totalLeaveTypes = listCount(leaveTypes.value.data)
    } else failures.push(leaveTypes.reason)

    if (holidays.status === "fulfilled") {
      next.upcomingHolidays = countHolidaysWithin30Days(
        unwrapList<{ date?: string }>(holidays.value.data),
        today
      )
    } else failures.push(holidays.reason)

    setStats(next)
    setLoaded(true)

    if (failures.length > 0) {
      console.error("Failed to fetch leave dashboard stats:", failures)
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(failures[0]) || undefined,
      })
    }
  }, [t])

  useEffect(() => {
    let ignore = false
    fetchStats(() => ignore)
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const count = (value: number | null) => (value === null ? null : String(value))

  const items: StatItem[] = [
    {
      key: "pending",
      label: t("overview.pendingRequests"),
      value: count(stats.myPendingRequests),
      hint: t("overview.awaitingApproval"),
      testId: "stat-my-pending",
    },
    {
      key: "approved",
      label: t("overview.approvedLeaves"),
      value: count(stats.myApprovedThisYear),
      hint: t("overview.thisYear"),
      testId: "stat-approved",
    },
    {
      key: "balance",
      label: t("overview.leaveBalance"),
      value: stats.myTotalBalance === null ? null : formatDays(stats.myTotalBalance),
      hint: t("overview.daysRemaining"),
      hintTone: stats.myTotalBalance !== null && stats.myTotalBalance > 0 ? "success" : "muted",
      testId: "stat-balance",
    },
    ...(showTeamCard
      ? [
          {
            key: "team",
            label: t("overview.teamPending"),
            value: count(stats.teamPendingRequests),
            hint: t("overview.requireYourApproval"),
            hintTone: (stats.teamPendingRequests ?? 0) > 0 ? ("warning" as const) : ("muted" as const),
            onClick: () => router.push("/leave/team-requests"),
            testId: "stat-team-pending",
          },
        ]
      : []),
    {
      key: "types",
      label: t("overview.leaveTypes"),
      value: count(stats.totalLeaveTypes),
      hint: t("overview.activeLeaveTypes"),
      testId: "stat-leave-types",
    },
    {
      key: "holidays",
      label: t("overview.upcomingHolidays"),
      value: count(stats.upcomingHolidays),
      hint: t("overview.next30Days"),
      testId: "stat-holidays",
    },
  ]

  const quickLinks: { title: string; description: string; href: string; icon: LucideIcon }[] = [
    {
      title: t("overview.links.myRequests.title"),
      description: t("overview.links.myRequests.description"),
      href: "/leave/my-requests",
      icon: FileText,
    },
    {
      title: t("overview.links.myBalance.title"),
      description: t("overview.links.myBalance.description"),
      href: "/leave/my-balance",
      icon: CalendarDays,
    },
    {
      title: t("overview.links.teamRequests.title"),
      description: t("overview.links.teamRequests.description"),
      href: "/leave/team-requests",
      icon: Users,
    },
    {
      title: t("overview.links.allRequests.title"),
      description: t("overview.links.allRequests.description"),
      href: "/leave/all-requests",
      icon: CalendarCheck,
    },
  ]

  return (
    <>
      <LeaveHeaderBridge
        primary={{
          label: t("myRequests.newRequest"),
          icon: Plus,
          onClick: () => setIsDialogOpen(true),
          testId: "new-request",
        }}
      />
      <LeavePage width="medium" testId="leave-overview">
        {awaitingMyConsent > 0 && (
          <LeaveBanner
            icon={<Handshake className="h-4 w-4 text-primary" aria-hidden />}
            action={
              <Link href="/leave/covering" className={leaveButton.outlineSm} data-testid="covering-banner-link">
                {t("overview.reviewCovering")}
              </Link>
            }
          >
            <span className="font-medium">{t("hr.covering.dashboardBanner", { count: awaitingMyConsent })}</span>
          </LeaveBanner>
        )}

        <StatGrid items={items} loading={!loaded} testId="leave-overview-stats" />

        <SectionCard title={t("overview.quickActions")} hint={t("overview.quickActionsDescription")} testId="leave-quick-links">
          <ul className="grid gap-px bg-border sm:grid-cols-2">
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <li key={link.href} className="min-w-0 bg-card">
                  <Link
                    href={link.href}
                    className="group flex min-h-14 items-center gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-foreground">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-medium">{link.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{link.description}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      </LeavePage>

      {dialogMounted && (
        <NewRequestDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmitted={() => fetchStats()}
        />
      )}
    </>
  )
}
