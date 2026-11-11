/**
 * The BKG-00 api mock plus the booking create call, and the calendar range
 * fixtures (the range endpoint goes through `@/api/axios`, mocked separately:
 *   vi.mock("@/api/axios", () => ({ default: { get: axiosGet } }))
 */
import { vi } from "vitest"
import { api as base } from "./bkg00-api-mock"

export { httpError } from "./bkg00-api-mock"

export const api = {
  ...base,
  bookingsAdminBookingsCreate: vi.fn(),
}

export function resetApi() {
  for (const fn of Object.values(api)) fn.mockReset()
  api.bookingsAdminSettingsRetrieve.mockResolvedValue({ id: 1, timezone: "Asia/Tbilisi" })
}

/** A calendar booking as `admin/calendar/` returns it. */
export function makeCalendarBooking(id: number, over: Record<string, unknown> = {}) {
  return {
    id,
    booking_number: `BK-${1050 + id}`,
    client: { id: 100 + id, full_name: `Client ${id}`, phone_number: `+99559300000${id}`, email: `c${id}@example.com` },
    service: { id: 7, name_display: "Whitening", duration_minutes: 60, buffer_time_minutes: 0 },
    staff_id: 3,
    date: "2026-11-10",
    start_time: "10:00:00",
    end_time: "11:00:00",
    status: "pending",
    payment_status: "pending",
    payment_method: "cash",
    total_amount: "350.00",
    deposit_amount: "0.00",
    paid_amount: "0.00",
    client_notes: "",
    staff_notes: "",
    created_at: "2026-11-06T09:02:00Z",
    ...over,
  }
}

const week = (start: string, end: string, breakStart: string | null = null, breakEnd: string | null = null) =>
  Array.from({ length: 7 }, (_, day_of_week) => ({
    id: day_of_week + 1,
    day_of_week,
    start_time: start,
    end_time: end,
    is_available: day_of_week < 6,
    break_start: breakStart,
    break_end: breakEnd,
  }))

/** Two active specialists: Nino (10–19 with a 14–14:30 break) and Lasha (09–18, Sundays off). */
export const STAFF = [
  { id: 3, user_id: 30, full_name: "Nino Beridze", profile_image: null, is_active_for_bookings: true, availability: week("10:00:00", "19:00:00", "14:00:00", "14:30:00"), exceptions: [] },
  { id: 2, user_id: 20, full_name: "Lasha Meladze", profile_image: null, is_active_for_bookings: true, availability: week("09:00:00", "18:00:00"), exceptions: [] },
]

export function calendarPayload(bookings: ReturnType<typeof makeCalendarBooking>[], over: Record<string, unknown> = {}) {
  return { date_from: "2026-11-10", date_to: "2026-11-10", timezone: "Asia/Tbilisi", staff: STAFF, bookings, ...over }
}

/** jsdom has no `matchMedia`; the Specialists view reads it for the mobile column width. */
export function mockViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true })
  window.matchMedia = ((query: string) => ({
    matches: width < 768,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
