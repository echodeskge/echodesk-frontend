/**
 * BKG-03: Settings → Bookings gains the bank-transfer fields (`payment_method`,
 * `bank_name`, `bank_iban`, `bank_account_holder`) in the payment section.
 * The save bar behaviour (dirty / discard / save) is unchanged.
 */
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderBookings } from "./bkg00-helpers"

const s = vi.hoisted(() => ({ isBookingAdmin: true, get: vi.fn(), patch: vi.fn(), toast: vi.fn(), testSms: vi.fn() }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ isBookingAdmin: s.isBookingAdmin }) }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: s.toast }) }))
vi.mock("@/api/axios", () => ({ default: { get: s.get, patch: s.patch } }))
vi.mock("@/api/generated", () => ({ bookingsAdminSettingsTestSmsCreate: s.testSms }))

import BookingSettingsPage from "@/app/(tenant)/settings/bookings/page"

const BOOKING = {
  id: 3,
  payment_method: "manual_transfer",
  bank_name: "TBC Bank",
  bank_iban: "GE29TB7777777777777777",
  bank_account_holder: "Demo Clinic LLC",
  require_deposit: false,
  allow_cash_payment: true,
  allow_card_payment: true,
  bog_use_production: false,
  has_bog_client_id: false,
  has_bog_client_secret: false,
  cancellation_hours_before: 24,
  refund_policy: "full",
  auto_confirm_on_deposit: true,
  auto_confirm_on_full_payment: true,
  min_hours_before_booking: 2,
  max_days_advance_booking: 60,
  public_page_enabled: true,
  public_description: { ka: "", en: "" },
  public_address: "Main st",
  public_phone: "",
  timezone: "Asia/Tbilisi",
  reminder_hours_before: 24,
  second_reminder_hours_before: null,
  sms_enabled: false,
  sms_on_created: false,
  sms_on_confirmed: true,
  sms_on_rescheduled: true,
  sms_on_cancelled: true,
  sms_on_reminder: true,
  sms_templates: {},
  has_sms_api_key: false,
  sms_sent_this_month: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  s.isBookingAdmin = true
  s.get.mockResolvedValue({ data: BOOKING })
  s.patch.mockImplementation(async (_url: string, data: object) => ({ data: { ...BOOKING, ...data } }))
})

describe("BKG-03 booking settings: bank transfer fields", () => {
  it("shows the payment method choice and the saved bank details", async () => {
    renderBookings(<BookingSettingsPage />)
    const choice = await screen.findByTestId("bk-payment-method")
    expect(within(choice).getByRole("radio", { name: "Bank transfer" })).toHaveAttribute("aria-checked", "true")
    expect(within(choice).getByRole("radio", { name: "BOG card gateway" })).toHaveAttribute("aria-checked", "false")
    expect(screen.getByLabelText("Bank name")).toHaveValue("TBC Bank")
    expect(screen.getByLabelText("IBAN")).toHaveValue("GE29TB7777777777777777")
    expect(screen.getByLabelText("Account holder")).toHaveValue("Demo Clinic LLC")
    expect(screen.getByTestId("booking-settings-savebar")).toHaveTextContent("All changes saved")
  })

  it("saves the bank fields (IBAN upper-cased, spaces removed) in the PATCH payload", async () => {
    renderBookings(<BookingSettingsPage />)
    fireEvent.change(await screen.findByLabelText("IBAN"), { target: { value: "ge12 tb00 1234 5678 9012 34" } })
    fireEvent.change(screen.getByLabelText("Bank name"), { target: { value: "Bank of Georgia" } })
    fireEvent.change(screen.getByLabelText("Account holder"), { target: { value: "Nino Beridze" } })
    expect(screen.getByLabelText("IBAN")).toHaveValue("GE12TB0012345678901234")
    expect(screen.getByTestId("booking-settings-savebar")).toHaveTextContent("You have unsaved changes")
    fireEvent.click(screen.getByTestId("booking-settings-savebar-save"))
    await waitFor(() => expect(s.patch).toHaveBeenCalledTimes(1))
    const [url, payload] = s.patch.mock.calls[0]
    expect(url).toBe("/api/bookings/admin/settings/")
    expect(payload).toMatchObject({
      payment_method: "manual_transfer",
      bank_name: "Bank of Georgia",
      bank_iban: "GE12TB0012345678901234",
      bank_account_holder: "Nino Beridze",
      allow_cash_payment: true,
    })
    expect(payload).not.toHaveProperty("id")
    await waitFor(() => expect(screen.getByTestId("booking-settings-savebar")).toHaveTextContent("All changes saved"))
  })

  it("choosing the BOG gateway hides the bank details and saves payment_method; Discard restores it", async () => {
    renderBookings(<BookingSettingsPage />)
    const choice = await screen.findByTestId("bk-payment-method")
    fireEvent.click(within(choice).getByRole("radio", { name: "BOG card gateway" }))
    expect(screen.queryByLabelText("Bank name")).toBeNull()
    expect(screen.getByTestId("booking-settings-savebar")).toHaveTextContent("You have unsaved changes")
    fireEvent.click(screen.getByTestId("booking-settings-savebar-discard"))
    expect(screen.getByLabelText("Bank name")).toHaveValue("TBC Bank")
    expect(s.patch).not.toHaveBeenCalled()

    fireEvent.click(within(screen.getByTestId("bk-payment-method")).getByRole("radio", { name: "BOG card gateway" }))
    fireEvent.click(screen.getByTestId("booking-settings-savebar-save"))
    await waitFor(() => expect(s.patch).toHaveBeenCalledTimes(1))
    expect(s.patch.mock.calls[0][1]).toMatchObject({ payment_method: "bog_gateway", bank_name: "TBC Bank" })
  })

  it("a settings payload without payment_method still renders (older API) and Georgian labels", async () => {
    const { payment_method: _pm, bank_name: _bn, bank_iban: _bi, bank_account_holder: _bh, ...older } = BOOKING
    s.get.mockResolvedValue({ data: older })
    renderBookings(<BookingSettingsPage />, "ka")
    const choice = await screen.findByTestId("bk-payment-method")
    expect(within(choice).getByRole("radio", { name: "საბანკო გადარიცხვა" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByLabelText("ბანკის დასახელება")).toHaveValue("")
    expect(screen.getByLabelText("ანგარიშის მფლობელი")).toHaveValue("")
  })
})
