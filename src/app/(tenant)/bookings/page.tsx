"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Briefcase, Calendar, CalendarCheck, CheckCircle2, Clock, DollarSign, Users, type LucideIcon } from "lucide-react"
import { fetchActiveServicesCount, fetchDashboard } from "./_lib/bookings-api"
import { dashboardTiles, type DashboardTiles } from "./_lib/dashboard-tiles"
import {
  BookingsErrorState,
  BookingsHeaderBridge,
  BookingsPage,
  BookingsStatGrid,
  SectionCard,
  type BookingsStatItem,
} from "./_components/ui"

interface QuickLink {
  key: string
  title: string
  description: string
  href: string
  icon: LucideIcon
  tint: string
}

export default function BookingsDashboard() {
  const t = useTranslations("bookingsDashboard")
  const locale = useLocale()
  const [tiles, setTiles] = useState<DashboardTiles | null>(null)
  const [activeServices, setActiveServices] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashboard, services] = await Promise.all([fetchDashboard(locale), fetchActiveServicesCount()])
      setTiles(dashboardTiles(dashboard))
      setActiveServices(services)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [locale])

  useEffect(() => {
    load()
  }, [load])

  const stats: BookingsStatItem[] = [
    { key: "today", label: t("todaysBookings"), value: tiles?.todayBookings, hint: t("scheduledForToday"), icon: Calendar, testId: "bkg-tile-today" },
    { key: "pending", label: t("pendingApproval"), value: tiles?.pendingApproval, hint: t("awaitingConfirmation"), icon: Clock, testId: "bkg-tile-pending" },
    { key: "completed", label: t("completedToday"), value: tiles?.completedToday, hint: t("successfullyCompleted"), icon: CheckCircle2, testId: "bkg-tile-completed" },
    { key: "revenue", label: t("revenueThisWeek"), value: tiles?.weekRevenue, hint: t("thisWeek"), icon: DollarSign, testId: "bkg-tile-revenue" },
  ]
  const counts: BookingsStatItem[] = [
    { key: "services", label: t("activeServices"), value: activeServices, testId: "bkg-tile-services" },
    { key: "staff", label: t("activeStaff"), value: tiles?.activeStaff, testId: "bkg-tile-staff" },
    { key: "clients", label: t("totalClients"), value: tiles?.totalClients, testId: "bkg-tile-clients" },
  ]

  const quickLinks: QuickLink[] = [
    { key: "bookings", title: t("allBookings"), description: t("viewManageBookings"), href: "/bookings/bookings", icon: CalendarCheck, tint: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { key: "services", title: t("services"), description: t("manageServices"), href: "/bookings/services", icon: Briefcase, tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { key: "staff", title: t("staff"), description: t("manageStaff"), href: "/bookings/staff", icon: Users, tint: "bg-green-600/10 text-green-700 dark:text-green-400" },
    { key: "availability", title: t("staffAvailability"), description: t("manageSchedules"), href: "/bookings/staff/availability", icon: Clock, tint: "bg-teal-500/10 text-teal-700 dark:text-teal-400" },
    { key: "clients", title: t("clients"), description: t("viewClientInfo"), href: "/bookings/clients", icon: Users, tint: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  ]

  return (
    <BookingsPage width="wide" testId="bkg-dashboard">
      <BookingsHeaderBridge breadcrumb={t("title")} />
      {error ? (
        <BookingsErrorState error={error} onRetry={load} title={t("loadFailed")} />
      ) : (
        <>
          <BookingsStatGrid items={stats} loading={loading} testId="bkg-dashboard-stats" />
          <BookingsStatGrid items={counts} loading={loading} testId="bkg-dashboard-counts" className="grid-cols-[repeat(auto-fit,minmax(200px,1fr))]" />
        </>
      )}
      <SectionCard title={t("quickActions")} hint={t("navigateToSections")} testId="bkg-quick-actions">
        <nav className="grid gap-3 p-4 sm:grid-cols-2" aria-label={t("quickActions")}>
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.key}
                href={link.href}
                className="flex items-center gap-3 rounded-[10px] border bg-background px-3.5 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid={`bkg-quick-${link.key}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${link.tint}`} aria-hidden>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-medium">{link.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{link.description}</span>
                </span>
              </Link>
            )
          })}
        </nav>
      </SectionCard>
    </BookingsPage>
  )
}
