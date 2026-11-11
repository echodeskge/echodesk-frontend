/**
 * Bookings redesign primitives (BKG-00 foundation, delivered with BKG-01).
 * Pages import from here:
 *   import { BookingsHeaderBridge, BookingsPage, BookingsTable, ... } from "@/app/(tenant)/bookings/_components/ui"
 * Generic pieces come from the shared redesign kit (`@/components/redesign`);
 * the ones below add bookings texts (`bookingsUi.*`), test ids (`bkg-*`),
 * tones and formatting.
 */
export { BookingsHeaderBridge } from "./header-bridge"
export type { BookingsHeaderAction, BookingsHeaderBridgeProps } from "./header-bridge"
export { BookingsShell, BookingsPage, BookingsPageHeader, BookingsBanner } from "./page"
export type { BookingsPageProps, BookingsPageWidth } from "./page"
export { BookingsTable } from "./data-table"
export type { BookingsColumn, BookingsTableProps } from "./data-table"
export { BookingsEmptyState, BookingsErrorState, BookingsLoading, useBookingsErrorLabels } from "./states"
export { TonePill, BookingStatusPill, PaymentStatusPill, humanize } from "./pills"
export {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  bookingStatusTone,
  paymentStatusTone,
  TONE_CLASS,
  TONE_DOT,
} from "./tones"
export type { BookingStatus, PaymentStatus, BookingsTone } from "./tones"
export {
  CURRENCY_SIGN,
  formatBookingDate,
  formatBookingDateTime,
  formatTime,
  formatTimeRange,
  formatMoney,
  parseMoney,
  shiftDateOnly,
  todayInTimezone,
  formatShortDate,
  parseDateOnly,
  toDateOnlyString,
} from "./format"
export { displayName, staffName } from "./name"
export { BookingsStatTile, BookingsStatGrid, StatStrip, StatTile, StatGrid } from "./stats"
export type { BookingsStatItem, StatItem } from "./stats"
export { BookingsPagination, PAGE_SIZES, pageRange } from "./pagination"
export { Toolbar, ToolbarSearch, ToolbarSpacer, ToolbarSelect, Field, bkgField } from "./toolbar"
export { BookingsCard, InfoGrid, SummaryRows, DetailColumns } from "./card"

// Shared redesign kit, re-exported so pages need one import.
export { Segmented, SectionCard, FieldRow, Avatar, PersonCell, rdButton, isFromInteractive } from "@/components/redesign"
export type { SegmentedOption } from "@/components/redesign"
export { bkgButton } from "./buttons"
export { BookingsDialog } from "./dialog"
