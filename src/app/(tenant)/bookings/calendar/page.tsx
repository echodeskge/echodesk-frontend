"use client"

import { Suspense } from "react"
import { BookingsLoading } from "../_components/ui"
import { CalendarPage } from "./_components/calendar-page"

/** `useSearchParams` (the `?view=&date=` state) needs a Suspense boundary. */
export default function BookingCalendarPage() {
  return (
    <Suspense fallback={<BookingsLoading />}>
      <CalendarPage />
    </Suspense>
  )
}
