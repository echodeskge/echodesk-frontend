"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { format } from "date-fns"
import { enGB, ka } from "date-fns/locale"
import { BookingSession, SalonInfo, getSession, onSessionChange } from "@/lib/booking-api"

interface SalonContextValue {
  /** Tenant schema name — the path segment in book.echodesk.ge/<salon> */
  salon: string
  info: SalonInfo
}

const SalonContext = createContext<SalonContextValue | null>(null)

export function SalonProvider({
  salon,
  info,
  children,
}: SalonContextValue & { children: React.ReactNode }) {
  return <SalonContext.Provider value={{ salon, info }}>{children}</SalonContext.Provider>
}

export function useSalon(): SalonContextValue {
  const value = useContext(SalonContext)
  if (!value) throw new Error("useSalon must be used inside <SalonProvider>")
  return value
}

/**
 * The logged-in booking customer for this salon, or null. `ready` is false
 * until localStorage has been read, so pages can avoid flashing the
 * logged-out state on first paint.
 */
export function useBookingSession(): { session: BookingSession | null; ready: boolean } {
  const { salon } = useSalon()
  const [session, setSession] = useState<BookingSession | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const read = () => {
      setSession(getSession(salon))
      setReady(true)
    }
    read()
    return onSessionChange(read)
  }, [salon])

  return { session, ready }
}

/**
 * date-fns locale for the booking site. Not Intl.DateTimeFormat: browsers
 * don't all ship Georgian locale data (desktop Chrome falls back to English).
 */
export function dateFnsLocale(locale: string) {
  return locale === "ka" ? ka : enGB
}

/** e.g. "Tuesday, 6 October 2026" / "სამშაბათი, 6 ოქტომბერი 2026" */
export function formatLongDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  return format(new Date(year, month - 1, day), "EEEE, d MMMM yyyy", { locale: dateFnsLocale(locale) })
}
