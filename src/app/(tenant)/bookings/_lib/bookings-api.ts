/**
 * Typed wrappers over the generated booking admin client (BKG-00 foundation).
 * Pages call these instead of the positional generated functions, so a
 * filter is named at the call site and list loads never stop at the
 * backend's default 20 rows.
 */
import axios from "@/api/axios"
import {
  bookingsAdminAvailabilityCreate,
  bookingsAdminAvailabilityList,
  bookingsAdminAvailabilityPartialUpdate,
  bookingsAdminBookingsAssignStaffCreate,
  bookingsAdminBookingsCancelCreate,
  bookingsAdminBookingsCheckInCreate,
  bookingsAdminBookingsCheckPaymentStatusRetrieve,
  bookingsAdminBookingsCompleteCreate,
  bookingsAdminBookingsConfirmCreate,
  bookingsAdminBookingsCreate,
  bookingsAdminBookingsNoShowCreate,
  bookingsAdminBookingsPartialUpdate,
  bookingsAdminBookingsRecordPaymentCreate,
  bookingsAdminBookingsRescheduleCreate,
  bookingsAdminBookingsRetrieve,
  bookingsAdminBookingsRowsList,
  bookingsAdminCategoriesCreate,
  bookingsAdminCategoriesDestroy,
  bookingsAdminCategoriesList,
  bookingsAdminCategoriesPartialUpdate,
  bookingsAdminClientsBookingsRetrieve,
  bookingsAdminClientsList,
  bookingsAdminClientsRetrieve,
  bookingsAdminClientsStatsRetrieve,
  bookingsAdminDashboardRetrieve,
  bookingsAdminExceptionsCreate,
  bookingsAdminExceptionsDestroy,
  bookingsAdminExceptionsList,
  bookingsAdminExceptionsPartialUpdate,
  bookingsAdminServicesActivateCreate,
  bookingsAdminServicesCreate,
  bookingsAdminServicesDeactivateCreate,
  bookingsAdminServicesDestroy,
  bookingsAdminServicesList,
  bookingsAdminServicesPartialUpdate,
  bookingsAdminSettingsRetrieve,
  bookingsAdminSlotsRetrieve,
  bookingsAdminStaffAvailableUsersRetrieve,
  bookingsAdminStaffCreate,
  bookingsAdminStaffDestroy,
  bookingsAdminStaffList,
  bookingsAdminStaffPartialUpdate,
} from "@/api/generated"
import type {
  AdminBookingCreateRequest,
  AdminSlotsResponse,
  AvailableUser,
  BookingCancelResponse,
  BookingClient,
  BookingClientStats,
  BookingDashboard,
  BookingDetail,
  BookingList,
  BookingRow,
  BookingStaff,
  BookingStaffCreateRequest,
  MethodEnum,
  PaginatedBookingClientList,
  PaginatedBookingRowList,
  PatchedAdminBookingUpdateRequest,
  PatchedBookingStaffCreateRequest,
  PatchedServiceCategoryRequest,
  PatchedServiceCreateRequest,
  PatchedStaffAvailabilityRequest,
  PatchedStaffExceptionRequest,
  ServiceCategory,
  ServiceCategoryRequest,
  ServiceCreateRequest,
  ServiceDetail,
  ServiceList,
  StaffAvailability,
  StaffAvailabilityRequest,
  StaffException,
  StaffExceptionRequest,
} from "@/api/generated/interfaces"

/** The backend caps `page_size` at 100. */
export const MAX_PAGE_SIZE = 100

export interface Paginated<T> {
  count: number
  next?: string | null
  results: T[]
}

/**
 * Every row of a paginated endpoint: pages of `MAX_PAGE_SIZE` until `next`
 * is empty (or the count is reached). Replaces the old first-20-rows loads.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<Paginated<T> | T[]>,
  pageSize = MAX_PAGE_SIZE
): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; ; page += 1) {
    const res = await fetchPage(page, pageSize)
    if (Array.isArray(res)) return res
    out.push(...(res.results ?? []))
    const total = typeof res.count === "number" ? res.count : Number.POSITIVE_INFINITY
    if (!res.next || out.length >= total || (res.results ?? []).length === 0) break
  }
  return out
}

export type BookingStatusFilter = BookingRow["status"]

export interface BookingRowsParams {
  page?: number
  pageSize?: number
  search?: string
  status?: BookingStatusFilter
  dateFrom?: string
  dateTo?: string
  staff?: number
  client?: number
  lang?: string
}

/** Slim booking rows (`bookings/rows/`): the list page and the stat counts. */
export function fetchBookingRows(p: BookingRowsParams = {}): Promise<PaginatedBookingRowList> {
  return bookingsAdminBookingsRowsList(
    p.client,
    p.dateFrom,
    p.dateTo,
    p.lang,
    undefined,
    undefined,
    p.page,
    p.pageSize,
    undefined,
    p.search || undefined,
    undefined,
    p.staff,
    p.status
  )
}

export interface BookingStatusCounts {
  total: number
  pending: number
  confirmed: number
  completed: number
}

/** Total / pending / confirmed / completed counts, one `page_size=1` request each (the API has no counts endpoint). */
export async function fetchBookingStatusCounts(): Promise<BookingStatusCounts> {
  const [total, pending, confirmed, completed] = await Promise.all([
    fetchBookingRows({ pageSize: 1 }),
    fetchBookingRows({ pageSize: 1, status: "pending" }),
    fetchBookingRows({ pageSize: 1, status: "confirmed" }),
    fetchBookingRows({ pageSize: 1, status: "completed" }),
  ])
  return { total: total.count ?? 0, pending: pending.count ?? 0, confirmed: confirmed.count ?? 0, completed: completed.count ?? 0 }
}

/** `dashboard/?lite=1` (today's bookings without the heavy nested service). */
export function fetchDashboard(lang?: string): Promise<BookingDashboard> {
  return bookingsAdminDashboardRetrieve(lang, true)
}

/** Number of services with status `active` (the list's `count`, one row requested). */
export async function fetchActiveServicesCount(): Promise<number> {
  const res = await bookingsAdminServicesList(undefined, undefined, undefined, 1, 1, undefined, "active")
  return res.count ?? (res.results ?? []).length
}

export const fetchBooking = (id: number): Promise<BookingDetail> => bookingsAdminBookingsRetrieve(id)

/** Book for a customer by hand (`bookings/` POST): an existing `client_id` or the new customer's fields. */
export const createBooking = (data: AdminBookingCreateRequest): Promise<BookingDetail> => bookingsAdminBookingsCreate(data)

export const confirmBooking = (id: number, force = false): Promise<BookingDetail> =>
  bookingsAdminBookingsConfirmCreate(id, force ? { force: true } : {})

export const checkInBooking = (id: number, force = false): Promise<BookingDetail> =>
  bookingsAdminBookingsCheckInCreate(id, force ? { force: true } : {})

export const completeBooking = (id: number): Promise<BookingDetail> => bookingsAdminBookingsCompleteCreate(id)

export const markNoShow = (id: number): Promise<BookingDetail> => bookingsAdminBookingsNoShowCreate(id)

export const cancelBooking = (id: number, reason: string): Promise<BookingCancelResponse> =>
  bookingsAdminBookingsCancelCreate(id, { reason })

export const rescheduleBooking = (id: number, date: string, startTime: string): Promise<BookingDetail> =>
  bookingsAdminBookingsRescheduleCreate(id, { date, start_time: startTime })

export const assignBookingStaff = (id: number, staffId: number): Promise<BookingDetail> =>
  bookingsAdminBookingsAssignStaffCreate(id, { staff_id: staffId })

/** PATCH `staff_notes` / `client_notes` / `total_amount` (the only writable fields). */
export const updateBooking = (id: number, patch: PatchedAdminBookingUpdateRequest): Promise<BookingDetail> =>
  bookingsAdminBookingsPartialUpdate(id, patch)

export const recordBookingPayment = (
  id: number,
  payment: { amount: string; method: MethodEnum; note?: string }
): Promise<BookingDetail> => bookingsAdminBookingsRecordPaymentCreate(id, payment)

export const checkBookingPaymentStatus = (id: number): Promise<Record<string, unknown>> =>
  bookingsAdminBookingsCheckPaymentStatusRetrieve(id)

/** Staff members who can take bookings (every page). */
export function fetchActiveStaff(): Promise<BookingStaff[]> {
  return fetchAllPages((page, pageSize) => bookingsAdminStaffList(true, undefined, page, pageSize))
}

/** Free start times for a service on a day (`slots/`), skipping `excludeBooking`'s own time. */
export function fetchSlots(p: { service: number; date: string; staff?: number; excludeBooking?: number }): Promise<AdminSlotsResponse> {
  return bookingsAdminSlotsRetrieve(p.date, p.excludeBooking, undefined, p.service, p.staff)
}

export interface ClientsParams {
  page?: number
  pageSize?: number
  search?: string
  isVerified?: boolean
}

/** Booking clients directory (`clients/`): search covers name, phone and email. */
export function fetchBookingClients(p: ClientsParams = {}): Promise<PaginatedBookingClientList> {
  return bookingsAdminClientsList(p.isVerified, undefined, p.page, p.pageSize, p.search || undefined)
}

export const fetchBookingClient = (id: number): Promise<BookingClient> => bookingsAdminClientsRetrieve(id)

export const fetchClientStats = (id: number): Promise<BookingClientStats> => bookingsAdminClientsStatsRetrieve(id)

export const fetchClientBookings = (id: number, lang?: string): Promise<BookingList[]> =>
  bookingsAdminClientsBookingsRetrieve(id, lang, true)

export const DEFAULT_TIMEZONE = "Asia/Tbilisi"

// ---------------------------------------------------------------------------
// Calendar range (BKG-02): `admin/calendar/` is not in the generated client
// yet, so it is called through the shared axios instance (same base URL,
// token and error handling as the generated functions).
// ---------------------------------------------------------------------------

/** One weekly row of a staff member's hours (`day_of_week` 0 = Monday). */
export interface CalendarAvailability {
  id: number
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
  break_start: string | null
  break_end: string | null
}

/** A day the staff member is off or has special hours (only days inside the requested range). */
export interface CalendarException {
  id: number
  date: string
  start_time: string | null
  end_time: string | null
  is_available: boolean
  reason: string
}

export interface CalendarStaff {
  id: number
  user_id: number
  full_name: string
  profile_image: string | null
  is_active_for_bookings: boolean
  availability: CalendarAvailability[]
  exceptions: CalendarException[]
}

/** A booking of the calendar payload: the slim row plus `staff_id` and the notes. */
export interface CalendarBooking {
  id: number
  booking_number: string
  client: { id: number; full_name: string; phone_number: string; email: string }
  service: { id: number; name_display: string; duration_minutes: number; buffer_time_minutes: number }
  staff_id: number | null
  date: string
  start_time: string
  end_time: string
  status: BookingRow["status"]
  payment_status: BookingRow["payment_status"]
  payment_method?: string
  total_amount: string
  deposit_amount: string
  paid_amount: string
  client_notes: string
  staff_notes: string
  created_at: string
}

export interface CalendarRange {
  date_from: string
  date_to: string
  /** IANA zone the dates and times are in (the business timezone). */
  timezone: string
  staff: CalendarStaff[]
  bookings: CalendarBooking[]
}

/** The calendar endpoint refuses ranges longer than this many days. */
export const CALENDAR_MAX_DAYS = 62

export interface CalendarRangeParams {
  dateFrom: string
  dateTo: string
  /** Only these staff members (and their bookings). */
  staff?: number[]
  lang?: string
}

/**
 * Staff roster with hours + every booking of `[dateFrom, dateTo]` (at most
 * 62 days) in one request: `GET admin/calendar/?date_from&date_to&staff&lang`.
 */
export async function fetchCalendarRange(p: CalendarRangeParams): Promise<CalendarRange> {
  const res = await axios.get<CalendarRange>("/api/bookings/admin/calendar/", {
    params: {
      date_from: p.dateFrom,
      date_to: p.dateTo,
      staff: p.staff && p.staff.length > 0 ? p.staff.join(",") : undefined,
      lang: p.lang || undefined,
    },
  })
  return res.data
}

/** The business timezone from the booking settings (everyone with the feature may read them). */
export async function fetchBusinessTimezone(): Promise<string> {
  const settings = await bookingsAdminSettingsRetrieve()
  return settings.timezone || DEFAULT_TIMEZONE
}

// ---------------------------------------------------------------------------
// Catalog (BKG-03): services, categories, staff, availability, exceptions.
// ---------------------------------------------------------------------------

/** Every service, in the UI locale (`name_display`), newest filters off. */
export function fetchAllServices(): Promise<ServiceList[]> {
  return fetchAllPages((page, pageSize) => bookingsAdminServicesList(undefined, undefined, undefined, page, pageSize))
}

export const createService = (data: ServiceCreateRequest): Promise<ServiceDetail> => bookingsAdminServicesCreate(data)

export const updateService = (id: number, data: PatchedServiceCreateRequest): Promise<ServiceDetail> =>
  bookingsAdminServicesPartialUpdate(id, data)

/** 409 when the service still has bookings (`isConflictError`). */
export const deleteService = (id: number): Promise<unknown> => bookingsAdminServicesDestroy(id)

export const activateService = (id: number): Promise<ServiceDetail> => bookingsAdminServicesActivateCreate(id)

export const deactivateService = (id: number): Promise<ServiceDetail> => bookingsAdminServicesDeactivateCreate(id)

/** Every category, in display order. */
export function fetchAllCategories(): Promise<ServiceCategory[]> {
  return fetchAllPages((page, pageSize) => bookingsAdminCategoriesList(undefined, page, pageSize))
}

export const createCategory = (data: ServiceCategoryRequest): Promise<ServiceCategory> => bookingsAdminCategoriesCreate(data)

export const updateCategory = (id: number, data: PatchedServiceCategoryRequest): Promise<ServiceCategory> =>
  bookingsAdminCategoriesPartialUpdate(id, data)

export const deleteCategory = (id: number): Promise<unknown> => bookingsAdminCategoriesDestroy(id)

/** Every staff member, active for bookings or not. */
export function fetchAllStaff(): Promise<BookingStaff[]> {
  return fetchAllPages((page, pageSize) => bookingsAdminStaffList(undefined, undefined, page, pageSize))
}

export const createStaff = (data: BookingStaffCreateRequest): Promise<BookingStaff> => bookingsAdminStaffCreate(data)

export const updateStaff = (id: number, data: PatchedBookingStaffCreateRequest): Promise<BookingStaff> =>
  bookingsAdminStaffPartialUpdate(id, data)

export const deleteStaff = (id: number): Promise<unknown> => bookingsAdminStaffDestroy(id)

/** Users who are not booking staff yet (`staff/available_users/?search=`). */
export const fetchAvailableUsers = (search?: string): Promise<AvailableUser[]> =>
  bookingsAdminStaffAvailableUsersRetrieve(search || undefined)

/** A staff member's weekly rows (at most one per weekday). */
export function fetchStaffAvailability(staffId: number): Promise<StaffAvailability[]> {
  return fetchAllPages((page, pageSize) =>
    bookingsAdminAvailabilityList(undefined, undefined, undefined, page, pageSize, undefined, staffId)
  )
}

export const createAvailability = (data: StaffAvailabilityRequest): Promise<StaffAvailability> =>
  bookingsAdminAvailabilityCreate(data)

export const updateAvailability = (id: number, data: PatchedStaffAvailabilityRequest): Promise<StaffAvailability> =>
  bookingsAdminAvailabilityPartialUpdate(id, data)

/** A staff member's exceptions from today on (`showPast` for the older ones too). */
export function fetchStaffExceptions(staffId: number, showPast = false): Promise<StaffException[]> {
  return fetchAllPages((page, pageSize) =>
    bookingsAdminExceptionsList(undefined, undefined, page, pageSize, undefined, showPast || undefined, staffId)
  )
}

export const createException = (data: StaffExceptionRequest): Promise<StaffException> => bookingsAdminExceptionsCreate(data)

export const updateException = (id: number, data: PatchedStaffExceptionRequest): Promise<StaffException> =>
  bookingsAdminExceptionsPartialUpdate(id, data)

export const deleteException = (id: number): Promise<unknown> => bookingsAdminExceptionsDestroy(id)

/** True for an HTTP 409 (a service delete refused because bookings reference it). */
export function isConflictError(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status === 409
}

export type {
  BookingClient,
  BookingRow,
  BookingDetail,
  BookingList,
  BookingStaff,
  BookingClientStats,
  ServiceList,
  ServiceCategory,
  StaffAvailability,
  StaffException,
  AvailableUser,
}
