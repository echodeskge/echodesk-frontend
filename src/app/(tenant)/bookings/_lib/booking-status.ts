/**
 * Booking status rules (BKG-00 foundation): which actions a booking allows,
 * mirroring `booking_management/views_admin.py` so the UI hides actions the
 * backend would refuse with a 400.
 *
 * - confirm:      pending → confirmed (an unpaid online-card booking needs `force`)
 * - check in:     pending / confirmed → in_progress (same payment rule when pending)
 * - complete:     confirmed / in_progress → completed
 * - no-show:      pending / confirmed → no_show
 * - cancel:       anything not final → cancelled
 * - reschedule / assign staff: pending / confirmed only
 */
import type { BookingStatus } from "../_components/ui/tones"

export type { BookingStatus }

export const FINAL_STATUSES: readonly BookingStatus[] = ["completed", "cancelled", "no_show"]

export function isFinalStatus(status: string | null | undefined): boolean {
  return FINAL_STATUSES.includes(status as BookingStatus)
}

export function canConfirm(status: string | null | undefined): boolean {
  return status === "pending"
}

export function canCheckIn(status: string | null | undefined): boolean {
  return status === "pending" || status === "confirmed"
}

export function canComplete(status: string | null | undefined): boolean {
  return status === "confirmed" || status === "in_progress"
}

export function canMarkNoShow(status: string | null | undefined): boolean {
  return status === "pending" || status === "confirmed"
}

export function canCancel(status: string | null | undefined): boolean {
  return !!status && !isFinalStatus(status)
}

export function canReschedule(status: string | null | undefined): boolean {
  return status === "pending" || status === "confirmed"
}

export function canAssignStaff(status: string | null | undefined): boolean {
  return status === "pending" || status === "confirmed"
}

export interface BookingActions {
  confirm: boolean
  checkIn: boolean
  complete: boolean
  noShow: boolean
  reschedule: boolean
  assignStaff: boolean
  cancel: boolean
}

/** Every action flag for a status (the detail page's action row). */
export function bookingActions(status: string | null | undefined): BookingActions {
  return {
    confirm: canConfirm(status),
    checkIn: canCheckIn(status),
    complete: canComplete(status),
    noShow: canMarkNoShow(status),
    reschedule: canReschedule(status),
    assignStaff: canAssignStaff(status),
    cancel: canCancel(status),
  }
}

/** A payment can be recorded while the booking is open and something is still owed. */
export function canRecordPayment(booking: { status?: string | null; total_amount?: string | number | null; paid_amount?: string | number | null }): boolean {
  if (booking.status === "cancelled") return false
  const total = Number(booking.total_amount ?? 0)
  const paid = Number(booking.paid_amount ?? 0)
  return Number.isFinite(total) && Number.isFinite(paid) && total - paid > 0
}

/**
 * True when confirm / check-in was refused because the customer chose to pay
 * online by card and has not paid yet: the backend answers 400 with
 * "... Use force=true to override." and the UI offers to force it.
 */
export function needsForce(error: unknown): boolean {
  const e = error as { response?: { status?: number; data?: { error?: unknown } } } | null | undefined
  if (!e?.response || e.response.status !== 400) return false
  const message = e.response.data?.error
  return typeof message === "string" && /force=true/i.test(message)
}

/** The booking's handler: the assigned staff member's user id, when any. */
export function handlerUserId(booking: { staff?: { user?: { id?: number } | null; user_id?: number } | null }): number | null {
  const s = booking.staff
  if (!s) return null
  return s.user?.id ?? s.user_id ?? null
}
