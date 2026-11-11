/**
 * `vi.fn()` stand-ins for every generated booking admin function the
 * bookings pages reach through `_lib/bookings-api.ts`. Tests mock the module:
 *   vi.mock("@/api/generated", async () => (await import("./bkg00-api-mock")).api)
 * and set return values on `api.<name>` per test (`resetApi()` in beforeEach).
 */
import { vi } from "vitest"

export const api = {
  bookingsAdminBookingsAssignStaffCreate: vi.fn(),
  bookingsAdminBookingsCancelCreate: vi.fn(),
  bookingsAdminBookingsCheckInCreate: vi.fn(),
  bookingsAdminBookingsCheckPaymentStatusRetrieve: vi.fn(),
  bookingsAdminBookingsCompleteCreate: vi.fn(),
  bookingsAdminBookingsConfirmCreate: vi.fn(),
  bookingsAdminBookingsNoShowCreate: vi.fn(),
  bookingsAdminBookingsPartialUpdate: vi.fn(),
  bookingsAdminBookingsRecordPaymentCreate: vi.fn(),
  bookingsAdminBookingsRescheduleCreate: vi.fn(),
  bookingsAdminBookingsRetrieve: vi.fn(),
  bookingsAdminBookingsRowsList: vi.fn(),
  bookingsAdminClientsBookingsRetrieve: vi.fn(),
  bookingsAdminClientsList: vi.fn(),
  bookingsAdminClientsRetrieve: vi.fn(),
  bookingsAdminClientsStatsRetrieve: vi.fn(),
  bookingsAdminDashboardRetrieve: vi.fn(),
  bookingsAdminServicesList: vi.fn(),
  bookingsAdminSettingsRetrieve: vi.fn(),
  bookingsAdminSlotsRetrieve: vi.fn(),
  bookingsAdminStaffList: vi.fn(),
}

export function resetApi() {
  for (const fn of Object.values(api)) fn.mockReset()
  api.bookingsAdminSettingsRetrieve.mockResolvedValue({ id: 1, timezone: "Asia/Tbilisi" })
}

/** An axios-like error with a response. */
export function httpError(status: number, data: unknown = {}) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data } })
}
