import React from "react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderBookings } from "./bkg00-helpers"
import { api, httpError, makeCategory, page, resetApi } from "./bkg03-api-mock"

vi.mock("@/api/generated", async () => (await import("./bkg03-api-mock")).api)
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
const access = vi.hoisted(() => ({ current: { isBookingAdmin: true, userId: 1, loaded: true } }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => access.current }))

import CategoriesPage from "@/app/(tenant)/bookings/categories/page"
import { categoryToPayload, categoryToForm } from "@/app/(tenant)/bookings/categories/_components/category-form"

const CATEGORIES = [
  makeCategory(1, { name: { en: "Hygiene", ka: "ჰიგიენა" }, name_display: "Hygiene", description_display: "Cleaning and prevention", icon: "sparkles", display_order: 1 }),
  makeCategory(2, { name: { en: "Surgery", ka: "ქირურგია" }, name_display: "Surgery", description_display: "Implants and extractions", is_active: false, display_order: 4 }),
]

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.releasePointerCapture = vi.fn()
})

beforeEach(() => {
  resetApi()
  Object.values(toast).forEach((f) => f.mockReset())
  access.current = { isBookingAdmin: true, userId: 1, loaded: true }
  api.bookingsAdminCategoriesList.mockResolvedValue(page(CATEGORIES))
  api.bookingsAdminCategoriesCreate.mockResolvedValue(makeCategory(9))
  api.bookingsAdminCategoriesPartialUpdate.mockResolvedValue(makeCategory(1))
  api.bookingsAdminCategoriesDestroy.mockResolvedValue({})
})

const fill = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } })

describe("BKG-03 categories", () => {
  it("form helpers keep both languages, icon, order and the active flag", () => {
    const f = categoryToForm(CATEGORIES[1] as never)
    expect(f).toEqual({ name: { en: "Surgery", ka: "ქირურგია" }, description: { en: "Description 2", ka: "აღწერა 2" }, icon: "", displayOrder: "4", isActive: false })
    expect(categoryToPayload({ ...f, name: { en: "Surgery ", ka: "" } })).toEqual({
      name: { en: "Surgery", ka: "Surgery" },
      description: { en: "Description 2", ka: "აღწერა 2" },
      icon: "",
      display_order: 4,
      is_active: false,
    })
  })

  it("renders name, description and status, with the count and the add button", async () => {
    renderBookings(<CategoriesPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    expect(api.bookingsAdminCategoriesList).toHaveBeenCalledWith(undefined, 1, 100)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent("Hygiene")
    expect(rows[0]).toHaveTextContent("Cleaning and prevention")
    expect(within(rows[0]).getByTestId("bkg-category-status-pill")).toHaveTextContent("Active")
    expect(within(rows[1]).getByTestId("bkg-category-status-pill")).toHaveTextContent("Inactive")
    expect(await screen.findByTestId("bkg-header-sub")).toHaveTextContent("2 category(ies) found")
    expect(screen.getByTestId("bkg-categories-add")).toHaveTextContent("Add Category")
  })

  it("creates a category with localized texts, icon, order and the active switch", async () => {
    renderBookings(<CategoriesPage />)
    await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(screen.getByTestId("bkg-categories-add"))
    await screen.findByTestId("bkg-category-form")
    fill("bkg-category-name-en", "Cosmetic")
    fill("bkg-category-name-ka", "კოსმეტიკური")
    fill("bkg-category-desc-en", "Whitening and veneers")
    fill("bkg-category-desc-ka", "გათეთრება და ვინირები")
    fill("bkg-category-icon", "smile")
    fill("bkg-category-order", "3")
    fireEvent.click(screen.getByRole("switch"))
    fireEvent.click(screen.getByTestId("ec-form-submit"))
    await waitFor(() => expect(api.bookingsAdminCategoriesCreate).toHaveBeenCalledTimes(1))
    expect(api.bookingsAdminCategoriesCreate).toHaveBeenCalledWith({
      name: { en: "Cosmetic", ka: "კოსმეტიკური" },
      description: { en: "Whitening and veneers", ka: "გათეთრება და ვინირები" },
      icon: "smile",
      display_order: 3,
      is_active: false,
    })
    expect(toast.success).toHaveBeenCalledWith("Category created successfully")
  })

  it("requires a name in at least one language", async () => {
    renderBookings(<CategoriesPage />)
    await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(screen.getByTestId("bkg-categories-add"))
    await screen.findByTestId("bkg-category-form")
    fireEvent.click(screen.getByTestId("ec-form-submit"))
    expect(await screen.findByText("Category name is required")).toBeInTheDocument()
    expect(api.bookingsAdminCategoriesCreate).not.toHaveBeenCalled()
  })

  it("row click edits (prefilled in both languages) and PATCHes; a failure is a toast", async () => {
    api.bookingsAdminCategoriesPartialUpdate.mockRejectedValueOnce(httpError(400, { name: ["Too long"] }))
    renderBookings(<CategoriesPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(rows[0])
    await screen.findByTestId("bkg-category-form")
    expect(screen.getByTestId("bkg-category-name-en")).toHaveValue("Hygiene")
    expect(screen.getByTestId("bkg-category-name-ka")).toHaveValue("ჰიგიენა")
    expect(screen.getByTestId("bkg-category-icon")).toHaveValue("sparkles")
    fill("bkg-category-order", "7")
    fireEvent.click(screen.getByTestId("ec-form-submit"))
    await waitFor(() => expect(api.bookingsAdminCategoriesPartialUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ display_order: 7, name: { en: "Hygiene", ka: "ჰიგიენა" } })))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByTestId("bkg-category-form")).toBeInTheDocument()
  })

  it("delete goes through the confirm dialog", async () => {
    renderBookings(<CategoriesPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(within(rows[1]).getByTestId("bkg-category-actions-delete"))
    expect(await screen.findByTestId("bkg-category-delete")).toHaveTextContent("Surgery")
    expect(api.bookingsAdminCategoriesDestroy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId("bkg-category-delete-confirm"))
    await waitFor(() => expect(api.bookingsAdminCategoriesDestroy).toHaveBeenCalledWith(2))
    await waitFor(() => expect(api.bookingsAdminCategoriesList).toHaveBeenCalledTimes(2))
  })

  it("a non-admin gets no write controls, and the Georgian table reads in Georgian", async () => {
    access.current = { isBookingAdmin: false, userId: 1, loaded: true }
    renderBookings(<CategoriesPage />, "ka")
    const rows = await screen.findAllByTestId("bkg-table-row")
    expect(screen.queryByTestId("bkg-categories-add")).toBeNull()
    expect(screen.queryByTestId("bkg-category-actions")).toBeNull()
    expect(within(rows[0]).getByTestId("bkg-category-status-pill")).toHaveTextContent("აქტიური")
    fireEvent.click(rows[0])
    expect(screen.queryByTestId("bkg-category-form")).toBeNull()
  })
})
