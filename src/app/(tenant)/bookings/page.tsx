"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CalendarCheck, Clock, CheckCircle2, Users, Briefcase, DollarSign } from "lucide-react"

export default function BookingsDashboard() {
  const t = useTranslations("bookingsDashboard")
  const [stats, setStats] = useState({
    todayBookings: 0,
    upcomingBookings: 0,
    completedThisMonth: 0,
    totalRevenue: "0.00",
    activeServices: 0,
    activeStaff: 0,
    totalClients: 0,
    pendingBookings: 0,
  })

  useEffect(() => {
    // TODO: Fetch dashboard stats from API
    setStats({
      todayBookings: 0,
      upcomingBookings: 0,
      completedThisMonth: 0,
      totalRevenue: "0.00",
      activeServices: 0,
      activeStaff: 0,
      totalClients: 0,
      pendingBookings: 0,
    })
  }, [])

  const quickLinks = [
    {
      title: t("allBookings"),
      description: t("viewManageBookings"),
      href: "/bookings/bookings",
      icon: CalendarCheck,
      color: "text-blue-600",
    },
    {
      title: t("services"),
      description: t("manageServices"),
      href: "/bookings/services",
      icon: Briefcase,
      color: "text-purple-600",
    },
    {
      title: t("staff"),
      description: t("manageStaff"),
      href: "/bookings/staff",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: t("clients"),
      description: t("viewClientInfo"),
      href: "/bookings/clients",
      icon: Users,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("todaysBookings")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayBookings}</div>
            <p className="text-xs text-muted-foreground">{t("scheduledForToday")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingApproval")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBookings}</div>
            <p className="text-xs text-muted-foreground">{t("awaitingConfirmation")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("completedThisMonth")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">{t("successfullyCompleted")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalRevenue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₾{stats.totalRevenue}</div>
            <p className="text-xs text-muted-foreground">{t("thisMonth")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("activeServices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeServices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("activeStaff")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStaff}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("totalClients")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("quickActions")}</CardTitle>
          <CardDescription>{t("navigateToSections")}</CardDescription>
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
