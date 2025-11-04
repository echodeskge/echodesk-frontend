"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CalendarCheck, Clock, CheckCircle2, XCircle, CalendarDays, Users, FileText } from "lucide-react"

export default function LeaveDashboard() {
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
      title: "My Requests",
      description: "View and manage your leave requests",
      href: "/leave/my-requests",
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "My Balance",
      description: "Check your leave balance",
      href: "/leave/my-balance",
      icon: CalendarDays,
      color: "text-green-600",
    },
    {
      title: "Team Requests",
      description: "Approve team leave requests",
      href: "/leave/team-requests",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "All Requests",
      description: "Manage all leave requests",
      href: "/leave/all-requests",
      icon: CalendarCheck,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your leave management system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myPendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Leaves</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myApprovedRequests}</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myTotalBalance}</div>
            <p className="text-xs text-muted-foreground">Days remaining</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team on Leave</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamOnLeaveToday}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Team Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamPendingRequests}</div>
            <p className="text-xs text-muted-foreground">Require your approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Leave Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeaveTypes}</div>
            <p className="text-xs text-muted-foreground">Active leave types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Upcoming Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingHolidays}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to different sections</CardDescription>
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
