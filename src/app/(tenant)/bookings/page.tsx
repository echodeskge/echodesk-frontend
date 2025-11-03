"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CalendarCheck, Clock, CheckCircle2, Users, Briefcase, DollarSign } from "lucide-react"

export default function BookingsDashboard() {
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
      title: "All Bookings",
      description: "View and manage all bookings",
      href: "/bookings/bookings",
      icon: CalendarCheck,
      color: "text-blue-600",
    },
    {
      title: "Services",
      description: "Manage your services",
      href: "/bookings/services",
      icon: Briefcase,
      color: "text-purple-600",
    },
    {
      title: "Staff",
      description: "Manage staff members",
      href: "/bookings/staff",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Clients",
      description: "View client information",
      href: "/bookings/clients",
      icon: Users,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Booking Management</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your booking system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayBookings}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBookings}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₾{stats.totalRevenue}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeServices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStaff}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
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
