import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderLeave } from "./lv00-helpers"

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  api: {
    leaveAdminPublicHolidaysList: vi.fn(),
    leaveAdminPublicHolidaysRetrieve: vi.fn(),
    leaveAdminPublicHolidaysCreate: vi.fn(),
    leaveAdminPublicHolidaysUpdate: vi.fn(),
    leaveAdminPublicHolidaysDestroy: vi.fn(),
  },
  loadGeorgianHolidays: vi.fn(),
}))
vi.mock("sonner", () => ({ toast: h.toast }))
vi.mock("@/api/generated/api", () => h.api)
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }))
vi.mock("@/app/(tenant)/leave/_lib/hr-api", () => ({ loadGeorgianHolidays: h.loadGeorgianHolidays }))

import PublicHolidaysPage from "@/app/(tenant)/leave/public-holidays/page"

const LIST = [
  { id: 1, name: { en: "New Year's Day", ka: "ახალი წელი" }, date: "2026-01-01", is_recurring: true },
  { id: 2, name: { en: "Company day", ka: "კომპანიის დღე" }, date: "2026-12-30", is_recurring: false },
  { id: 3, name: { en: "New Year's Day", ka: "ახალი წელი" }, date: "2027-01-01", is_recurring: true },
]

beforeEach(() => {
  vi.clearAllMocks()
  h.api.leaveAdminPublicHolidaysList.mockResolvedValue({ results: LIST })
})

describe("LV-04 public holidays page", () => {
  it("formats dates as calendar days in the app locale (no UTC shift)", async () => {
    renderLeave(<PublicHolidaysPage />)
    const dates = (await screen.findAllByTestId("holiday-date")).map((d) => d.textContent)
    expect(dates).toEqual(["Jan 1, 2026", "Dec 30, 2026", "Jan 1, 2027"])
    expect(h.api.leaveAdminPublicHolidaysList).toHaveBeenCalledWith(undefined, undefined, undefined, "date", undefined, 100)
  })

  it("renders Georgian dates and names", async () => {
    renderLeave(<PublicHolidaysPage />, "ka")
    const dates = (await screen.findAllByTestId("holiday-date")).map((d) => d.textContent)
    expect(dates[0]).toBe("1 იან 2026")
    expect(screen.getAllByText("ახალი წელი")).toHaveLength(2)
  })

  it("filters by year on the client", async () => {
    renderLeave(<PublicHolidaysPage />)
    await screen.findAllByTestId("leave-table-row")
    const seg = screen.getByTestId("holidays-year")
    fireEvent.click(within(seg).getByRole("radio", { name: /2027/ }))
    expect(screen.getAllByTestId("leave-table-row")).toHaveLength(1)
    fireEvent.click(within(seg).getByRole("radio", { name: /All years/ }))
    expect(screen.getAllByTestId("leave-table-row")).toHaveLength(3)
    expect(h.api.leaveAdminPublicHolidaysList).toHaveBeenCalledTimes(1)
  })

  it("hides the year filter when every holiday is in one year", async () => {
    h.api.leaveAdminPublicHolidaysList.mockResolvedValue({ results: LIST.slice(0, 2) })
    renderLeave(<PublicHolidaysPage />)
    await screen.findAllByTestId("leave-table-row")
    expect(screen.queryByTestId("holidays-year")).toBeNull()
  })

  it("edit loads the detail (applies_to_all) and saves with PUT", async () => {
    h.api.leaveAdminPublicHolidaysRetrieve.mockResolvedValue({ ...LIST[1], applies_to_all: false })
    h.api.leaveAdminPublicHolidaysUpdate.mockResolvedValue({})
    renderLeave(<PublicHolidaysPage />)
    const rows = await screen.findAllByTestId("leave-table-row")
    fireEvent.click(rows[1])
    const dialog = await screen.findByTestId("holiday-dialog")
    expect(h.api.leaveAdminPublicHolidaysRetrieve).toHaveBeenCalledWith("2")
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2026-12-30")
    fireEvent.click(within(dialog).getByTestId("holiday-submit"))
    await waitFor(() =>
      expect(h.api.leaveAdminPublicHolidaysUpdate).toHaveBeenCalledWith("2", {
        name: { en: "Company day", ka: "კომპანიის დღე" },
        date: "2026-12-30",
        is_recurring: false,
        applies_to_all: false,
      })
    )
  })

  it("shows the error state instead of an empty table when loading fails", async () => {
    h.api.leaveAdminPublicHolidaysList.mockRejectedValueOnce(new Error("boom"))
    renderLeave(<PublicHolidaysPage />)
    expect(await screen.findByTestId("leave-error")).toBeInTheDocument()
    expect(screen.queryByText("No holidays")).toBeNull()
  })

  it("a 403 hides the create and Georgian-holiday buttons", async () => {
    h.api.leaveAdminPublicHolidaysList.mockRejectedValueOnce(Object.assign(new Error("forbidden"), { response: { status: 403 } }))
    renderLeave(<PublicHolidaysPage />)
    expect(await screen.findByTestId("leave-error")).toHaveAttribute("data-forbidden", "true")
    expect(screen.queryByTestId("holidays-new")).toBeNull()
    expect(screen.queryByTestId("holidays-georgian")).toBeNull()
  })
})
