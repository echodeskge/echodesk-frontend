/**
 * The BKG-00 api mock plus the catalog endpoints the BKG-03 pages reach
 * through `_lib/bookings-api.ts`. Tests mock the module:
 *   vi.mock("@/api/generated", async () => (await import("./bkg03-api-mock")).api)
 */
import { vi } from "vitest"
import { api as base } from "./bkg00-api-mock"

export { httpError } from "./bkg00-api-mock"

export const api = {
  ...base,
  bookingsAdminServicesCreate: vi.fn(),
  bookingsAdminServicesPartialUpdate: vi.fn(),
  bookingsAdminServicesDestroy: vi.fn(),
  bookingsAdminServicesActivateCreate: vi.fn(),
  bookingsAdminServicesDeactivateCreate: vi.fn(),
  bookingsAdminCategoriesList: vi.fn(),
  bookingsAdminCategoriesCreate: vi.fn(),
  bookingsAdminCategoriesPartialUpdate: vi.fn(),
  bookingsAdminCategoriesDestroy: vi.fn(),
  bookingsAdminStaffCreate: vi.fn(),
  bookingsAdminStaffPartialUpdate: vi.fn(),
  bookingsAdminStaffDestroy: vi.fn(),
  bookingsAdminStaffAvailableUsersRetrieve: vi.fn(),
  bookingsAdminAvailabilityList: vi.fn(),
  bookingsAdminAvailabilityCreate: vi.fn(),
  bookingsAdminAvailabilityPartialUpdate: vi.fn(),
  bookingsAdminExceptionsList: vi.fn(),
  bookingsAdminExceptionsCreate: vi.fn(),
  bookingsAdminExceptionsPartialUpdate: vi.fn(),
  bookingsAdminExceptionsDestroy: vi.fn(),
}

export function resetApi() {
  for (const fn of Object.values(api)) fn.mockReset()
  api.bookingsAdminSettingsRetrieve.mockResolvedValue({ id: 1, timezone: "Asia/Tbilisi" })
}

/** A one-page paginated response. */
export function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

/** Real payloads keep `name` and `name_display` consistent: a `name_display` override without `name` names both languages. */
function consistentName(over: Record<string, unknown>, fallback: { en: string; ka: string }) {
  if (over.name) return over.name
  const nd = over.name_display
  return typeof nd === "string" ? { en: nd, ka: nd } : fallback
}

export function makeCategory(id: number, over: Record<string, unknown> = {}) {
  return {
    id,
    name: consistentName(over, { en: `Category ${id}`, ka: `კატეგორია ${id}` }),
    description: { en: `Description ${id}`, ka: `აღწერა ${id}` },
    icon: "",
    display_order: id,
    is_active: true,
    name_display: `Category ${id}`,
    description_display: `Description ${id}`,
    ...over,
  }
}

export function makeStaff(id: number, over: Record<string, unknown> = {}) {
  return {
    id,
    user: { id: 30 + id, email: `staff${id}@example.com`, first_name: `Staff`, last_name: `${id}`, full_name: `Staff ${id}` },
    bio: "",
    profile_image: "",
    average_rating: "0.00",
    total_ratings: 0,
    is_active_for_bookings: true,
    services: [],
    services_count: 0,
    ...over,
  }
}

export function makeService(id: number, over: Record<string, unknown> = {}) {
  return {
    id,
    name: consistentName(over, { en: `Service ${id}`, ka: `სერვისი ${id}` }),
    description: { en: "", ka: "" },
    category: null,
    base_price: "120.00",
    deposit_percentage: 0,
    duration_minutes: 45,
    buffer_time_minutes: 0,
    booking_type: "duration_based",
    available_time_slots: [],
    staff_members: [],
    status: "active",
    image: null,
    name_display: `Service ${id}`,
    description_display: "",
    deposit_amount: 0,
    ...over,
  }
}
