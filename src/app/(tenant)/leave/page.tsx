"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CalendarCheck, Clock, CheckCircle2, XCircle, CalendarDays, Users, FileText } from "lucide-react"

export default function LeaveDashboard() {
  const t = useTranslations("leave")
  const [stats, setStats] = useState({
    myPendingRequests: 0,
    myApprovedRequests: 0,
    myRejectedRequests: 0,
    myTotalBalance: "0.0",
    teamPendingRequests: 0,
    totalLeaveTypes: 0,
    upcomingHolidays: 0,
    teamOnLeaveToday: 0,
  })

  useEffect(() => {
    // TODO: Fetch dashboard stats from API
    setStats({
      myPendingRequests: 0,
      myApprovedRequests: 0,
      myRejectedRequests: 0,
      myTotalBalance: "0.0",
      teamPendingRequests: 0,
      totalLeaveTypes: 0,
      upcomingHolidays: 0,
      teamOnLeaveToday: 0,
    })
  }, [])

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.pendingRequests")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myPendingRequests}</div>
            <p className="text-xs text-muted-foreground">{t("overview.awaitingApproval")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.approvedLeaves")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myApprovedRequests}</div>
            <p className="text-xs text-muted-foreground">{t("overview.thisYear")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.leaveBalance")}</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myTotalBalance}</div>
            <p className="text-xs text-muted-foreground">{t("overview.daysRemaining")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overview.teamOnLeave")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamOnLeaveToday}</div>
            <p className="text-xs text-muted-foreground">{t("overview.today")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("overview.teamPending")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamPendingRequests}</div>
            <p className="text-xs text-muted-foreground">{t("overview.requireYourApproval")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("overview.leaveTypes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeaveTypes}</div>
            <p className="text-xs text-muted-foreground">{t("overview.activeLeaveTypes")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("overview.upcomingHolidays")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingHolidays}</div>
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
