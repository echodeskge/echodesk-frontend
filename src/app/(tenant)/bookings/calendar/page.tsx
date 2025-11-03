"use client"

import { useState, useEffect, useRef } from "react"
import { apiBookingsAdminBookingsList } from "@/api/generated"
import { BookingList } from "@/api/generated/interfaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import type { EventInput } from "@fullcalendar/core/index.js"
import type { EventImpl } from "@fullcalendar/core/internal"

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--chart-1))",
  confirmed: "hsl(var(--chart-2))",
  in_progress: "hsl(var(--chart-3))",
  completed: "hsl(var(--chart-4))",
  cancelled: "hsl(var(--destructive))",
  no_show: "hsl(var(--muted-foreground))",
}

export default function BookingCalendarPage() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<BookingList[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek">("dayGridMonth")
  const [currentTitle, setCurrentTitle] = useState("")
  const calendarRef = useRef<FullCalendar>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await apiBookingsAdminBookingsList()
      setBookings((response.results || response) as BookingList[])
    } catch (error) {
      console.error("Failed to fetch bookings:", error)
      toast({ title: "Error", description: "Failed to fetch bookings", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Convert bookings to FullCalendar events
  const events: EventInput[] = bookings.map((booking) => {
    const serviceName = typeof booking.service.name === 'string'
      ? booking.service.name
      : booking.service.name.en || "Service"

    const startDateTime = new Date(`${booking.date}T${booking.start_time}`)
    const endDateTime = new Date(`${booking.date}T${booking.end_time}`)

    return {
      id: booking.id.toString(),
      title: `${serviceName} - ${booking.client.full_name}`,
      start: startDateTime,
      end: endDateTime,
      color: STATUS_COLORS[booking.status as unknown as string] || STATUS_COLORS.pending,
      extendedProps: {
        booking,
      },
    }
  })

  const handleEventClick = ({ event }: { event: EventImpl }) => {
    const booking = event.extendedProps.booking as BookingList
    toast({
      title: `Booking #${booking.booking_number}`,
      description: `${booking.client.full_name} - ${typeof booking.service.name === 'string' ? booking.service.name : booking.service.name.en}`,
    })
  }

  const handlePrevClick = () => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.prev()
      setCurrentTitle(calendarApi.view.title)
    }
  }

  const handleNextClick = () => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.next()
      setCurrentTitle(calendarApi.view.title)
    }
  }

  const handleTodayClick = () => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.today()
      setCurrentTitle(calendarApi.view.title)
    }
  }

  const handleViewChange = (view: typeof selectedView) => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.changeView(view)
      setCurrentTitle(calendarApi.view.title)
      setSelectedView(view)
    }
  }

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      setCurrentTitle(calendarApi.view.title)
    }
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Booking Calendar</h1>
        <p className="text-muted-foreground mt-1">View and manage your bookings in calendar format</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevClick}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleTodayClick}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextClick}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <h2 className="text-xl font-semibold">{currentTitle}</h2>

            <div className="flex gap-2">
              <Button
                variant={selectedView === "dayGridMonth" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewChange("dayGridMonth")}
              >
                Month
              </Button>
              <Button
                variant={selectedView === "timeGridWeek" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewChange("timeGridWeek")}
              >
                Week
              </Button>
              <Button
                variant={selectedView === "timeGridDay" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewChange("timeGridDay")}
              >
                Day
              </Button>
              <Button
                variant={selectedView === "listWeek" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewChange("listWeek")}
              >
                List
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.pending }}></div>
              <span className="text-xs">Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.confirmed }}></div>
              <span className="text-xs">Confirmed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.in_progress }}></div>
              <span className="text-xs">In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.completed }}></div>
              <span className="text-xs">Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.cancelled }}></div>
              <span className="text-xs">Cancelled</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={selectedView}
            events={events}
            eventClick={handleEventClick}
            headerToolbar={false}
            height="auto"
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false
            }}
            eventClassNames="cursor-pointer hover:opacity-80 transition-opacity"
          />
        </CardContent>
      </Card>
    </div>
  )
}
