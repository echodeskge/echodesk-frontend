import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import type { PromoCode } from "@/api/generated/interfaces"
import { renderEc } from "./ec00-helpers"

const api = { list: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn() }
vi.mock("@/api/generated", () => ({
  ecommerceAdminPromoCodesList: (...a: unknown[]) => api.list(...a),
  ecommerceAdminPromoCodesCreate: (...a: unknown[]) => api.create(...a),
  ecommerceAdminPromoCodesUpdate: (...a: unknown[]) => api.update(...a),
  ecommerceAdminPromoCodesDestroy: (...a: unknown[]) => api.destroy(...a),
}))
const toast = { success: vi.fn(), error: vi.fn() }
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }))

import PromoCodesPage from "@/app/(tenant)/ecommerce/promo-codes/page"
import { formatPercentValue, validRange } from "@/app/(tenant)/ecommerce/promo-codes/_components/promo-columns"

// Far past / far future validity: the page compares with the real clock, so these never flip.
const PAST = "2001-01-01T12:00:00Z"
const PAST2 = "2001-06-01T12:00:00Z"
const FUTURE = "2999-01-01T12:00:00Z"
const code = (id: number, extra: Partial<PromoCode>): PromoCode => ({
  id,
  code: `CODE${id}`,
  discount_type: "percentage" as PromoCode["discount_type"],
  discount_value: "15.00",
  min_order_amount: undefined,
  max_uses: undefined,
  times_used: 0,
  valid_from: PAST,
  valid_until: FUTURE,
  is_active: true,
  created_at: PAST,
  ...extra,
})
const CODES = [
  code(1, { code: "WELCOME10", discount_value: "10.00", max_uses: 500, times_used: 5 }),
  code(2, { code: "VIP50", discount_type: "fixed" as PromoCode["discount_type"], discount_value: "50.00", min_order_amount: "1300.00", max_uses: 20, times_used: 20 }),
  code(3, { code: "BLACKFRIDAY", valid_until: PAST2 }),
  code(4, { code: "SUMMER25", is_active: false, valid_until: PAST2 }),
  code(5, { code: "OFF", is_active: false }),
]
const rows = () => screen.getAllByTestId("ec-table-row")
const row = (text: string) => rows().find((r) => r.textContent?.includes(text))!

describe("promo helpers", () => {
  it("formats percent values and validity ranges", () => {
    expect(formatPercentValue("15.00")).toBe("15%")
    expect(formatPercentValue("12.50")).toBe("12.5%")
    expect(formatPercentValue("")).toBe("—")
    expect(validRange(null, null, "en")).toBe("— – —")
  })
})

describe("PromoCodesPage", () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    api.list.mockResolvedValue({ count: CODES.length, results: CODES })
    api.create.mockResolvedValue({})
    api.update.mockResolvedValue({})
    api.destroy.mockResolvedValue({})
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it("lists codes with type, discount, min order (₾), usage, validity and state", async () => {
    renderEc(<PromoCodesPage />)
    await waitFor(() => expect(rows()).toHaveLength(5))
    expect(await screen.findByTestId("ec-header-sub")).toHaveTextContent("5 promo code(s) found")
    expect(row("WELCOME10")).toHaveTextContent("Percentage")
    expect(row("WELCOME10")).toHaveTextContent("10%")
    expect(row("WELCOME10")).toHaveTextContent("5 / 500")
    expect(row("VIP50")).toHaveTextContent("₾50.00")
    expect(row("VIP50")).toHaveTextContent("₾1,300.00")
    expect(within(row("VIP50")).getByTestId("ec-promo-state")).toHaveTextContent("Maxed Out")
    expect(within(row("BLACKFRIDAY")).getByTestId("ec-promo-state")).toHaveTextContent("Expired")
    expect(within(row("SUMMER25")).getByTestId("ec-promo-state")).toHaveTextContent("Inactive")
    expect(within(row("WELCOME10")).getByTestId("ec-promo-state")).toHaveTextContent("Active")
  })

  it("keeps the old client-side filters (expired also matches inactive expired codes) and search", async () => {
    renderEc(<PromoCodesPage />)
    await waitFor(() => expect(rows()).toHaveLength(5))
    const status = screen.getByTestId("promo-status-filter")
    fireEvent.click(within(status).getByRole("radio", { name: "Active" }))
    expect(rows().map((r) => r.textContent)).toEqual([expect.stringContaining("WELCOME10")])
    fireEvent.click(within(status).getByRole("radio", { name: "Inactive" }))
    expect(rows()).toHaveLength(2)
    fireEvent.click(within(status).getByRole("radio", { name: "Expired" }))
    expect(rows()).toHaveLength(2)
    fireEvent.click(within(status).getByRole("radio", { name: "All" }))
    fireEvent.click(within(screen.getByTestId("promo-type-filter")).getByRole("radio", { name: "Fixed" }))
    expect(rows()).toHaveLength(1)
    fireEvent.change(screen.getByTestId("promo-search"), { target: { value: "zzz" } })
    expect(screen.getByTestId("ec-empty")).toHaveTextContent("Try adjusting your search or filters")
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(rows()).toHaveLength(5)
  })

  it("creates a code with the same payload and validation toasts", async () => {
    renderEc(<PromoCodesPage />)
    await waitFor(() => expect(rows()).toHaveLength(5))
    fireEvent.click(await screen.findByTestId("promo-add"))
    const sheet = await screen.findByTestId("promo-sheet")
    fireEvent.click(within(sheet).getByTestId("ec-form-submit"))
    expect(toast.error).toHaveBeenCalledWith("Promo code is required")
    fireEvent.change(within(sheet).getByLabelText(/Promo Code/), { target: { value: "new10" } })
    expect(within(sheet).getByLabelText(/Promo Code/)).toHaveValue("NEW10")
    fireEvent.click(within(sheet).getByRole("radio", { name: "Fixed" }))
    fireEvent.change(within(sheet).getByLabelText(/Discount Value/), { target: { value: "12.5" } })
    fireEvent.change(within(sheet).getByLabelText(/Valid From/), { target: { value: "2030-01-02T10:00" } })
    fireEvent.change(within(sheet).getByLabelText(/Valid Until/), { target: { value: "2030-01-01T10:00" } })
    fireEvent.click(within(sheet).getByTestId("ec-form-submit"))
    expect(toast.error).toHaveBeenLastCalledWith("Valid from date must be before valid until date")
    fireEvent.change(within(sheet).getByLabelText(/Valid Until/), { target: { value: "2030-02-01T10:00" } })
    fireEvent.click(within(sheet).getByTestId("ec-form-submit"))
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1))
    expect(api.create).toHaveBeenCalledWith({
      code: "NEW10",
      discount_type: "fixed",
      discount_value: "12.5",
      min_order_amount: "",
      max_uses: undefined,
      valid_from: new Date("2030-01-02T10:00").toISOString(),
      valid_until: new Date("2030-02-01T10:00").toISOString(),
      is_active: true,
    })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Promo code created successfully"))
  })

  it("edits a code (row click) without moving its dates, and deletes with confirmation", async () => {
    renderEc(<PromoCodesPage />)
    await waitFor(() => expect(rows()).toHaveLength(5))
    fireEvent.click(row("VIP50"))
    const sheet = await screen.findByTestId("promo-sheet")
    expect(within(sheet).getByLabelText(/Promo Code/)).toHaveValue("VIP50")
    fireEvent.click(within(sheet).getByTestId("ec-form-submit"))
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
    const [id, payload] = api.update.mock.calls[0]
    expect(id).toBe(2)
    // minute precision in the input; the instant is unchanged in any time zone
    expect(payload.valid_from).toBe(new Date(PAST).toISOString())
    expect(payload.valid_until).toBe(new Date(FUTURE).toISOString())
    expect(payload).toMatchObject({ code: "VIP50", discount_type: "fixed", discount_value: "50.00", min_order_amount: "1300.00", max_uses: 20, is_active: true })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Promo code updated successfully"))

    fireEvent.click(within(row("OFF")).getByRole("button", { name: "Delete OFF" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent('"OFF"')
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(api.destroy).toHaveBeenCalledWith(5))
  })

  it("shows the error state when the list fails, and renders Georgian", async () => {
    api.list.mockRejectedValueOnce({ response: { status: 500 } })
    const { unmount } = renderEc(<PromoCodesPage />)
    expect(await screen.findByTestId("ec-error")).toBeInTheDocument()
    unmount()
    renderEc(<PromoCodesPage />, "ka")
    await waitFor(() => expect(rows()).toHaveLength(5))
    expect(within(row("VIP50")).getByTestId("ec-promo-state")).toHaveTextContent("ლიმიტი ამოწურულია")
    expect(screen.getByRole("button", { name: "რედაქტირება: VIP50" })).toBeInTheDocument()
  })
})
