/**
 * ST-05 business modules, FORM PAGEs: booking settings and invoice settings.
 * The old Save buttons now live in the sticky save bar: same handler / form
 * submit, same payloads, same disabled rules. Discard goes back to the last
 * loaded values. No SMS, email or invoice is ever sent here.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor, act } from "@testing-library/react"
import { renderSt, messages, pending, flatten } from "./st-helpers"

const s = vi.hoisted(() => ({
  isBookingAdmin: true,
  get: vi.fn(),
  patch: vi.fn(),
  toast: vi.fn(),
  testSms: vi.fn(),
  updateSettings: vi.fn(),
  invoiceSettings: null as Record<string, unknown> | null,
}))

vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ isBookingAdmin: s.isBookingAdmin }) }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: s.toast }) }))
vi.mock("@/api/axios", () => ({ default: { get: s.get, patch: s.patch } }))
vi.mock("@/api/generated", () => ({ bookingsAdminSettingsTestSmsCreate: s.testSms }))

const mutation = (fn: (...a: unknown[]) => unknown = vi.fn()) => ({ mutateAsync: fn })
vi.mock("@/hooks/useInvoices", () => ({
  useInvoiceSettings: () => ({ data: s.invoiceSettings, isLoading: false }),
  useAvailableItemLists: () => ({ data: [{ id: 7, title: "Clients" }] }),
  useUpdateInvoiceSettings: () => mutation(s.updateSettings),
  useUploadLogo: () => mutation(),
  useUploadBadge: () => mutation(),
  useUploadSignature: () => mutation(),
  useRemoveLogo: () => mutation(),
  useRemoveBadge: () => mutation(),
  useRemoveSignature: () => mutation(),
}))

import BookingSettingsPage from "@/app/(tenant)/settings/bookings/page"
import InvoiceSettingsPage from "@/app/(tenant)/settings/invoices/page"

const BOOKING = {
  id: 3,
  require_deposit: false,
  allow_cash_payment: true,
  allow_card_payment: true,
  bog_client_id: "",
  bog_use_production: false,
  has_bog_client_id: true,
  has_bog_client_secret: true,
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

const INVOICE = {
  id: 1,
  company_name: "Demo LLC",
  tax_id: "400",
  registration_number: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  client_itemlist: null,
  materials_itemlist: null,
  invoice_prefix: "INV",
  starting_number: 1,
  default_currency: "GEL",
  default_tax_rate: "18",
  default_due_days: 30,
  email_from: "",
  email_from_name: "",
  email_cc: "",
  email_subject_template: "Invoice {invoice_number}",
  email_message_template: "",
  footer_text: "",
  default_terms: "",
  bank_accounts: [{ bank_name: "TBC", account_number: "GE01", iban: "", swift: "", is_default: true }],
}

beforeEach(() => {
  vi.clearAllMocks()
  s.isBookingAdmin = true
  s.get.mockResolvedValue({ data: BOOKING })
  s.patch.mockImplementation(async (_url: string, data: object) => ({ data: { ...BOOKING, ...data } }))
  s.updateSettings.mockResolvedValue({})
  s.invoiceSettings = { ...INVOICE }
})

describe("booking settings FORM PAGE", () => {
  it("renders every section and keeps the save in the bar", async () => {
    renderSt(<BookingSettingsPage />)
    expect(await screen.findByRole("heading", { name: "Booking Settings" })).toBeInTheDocument()
    for (const title of ["Payment Settings", "Booking Rules", "Cancellation Policy", "Auto Confirmation", "Reminders", "SMS notifications"]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.getByLabelText("BOG Client Secret")).toHaveAttribute("type", "password")
    const bar = screen.getByTestId("booking-settings-savebar")
    expect(bar).toHaveTextContent("All changes saved")
    expect(screen.getByTestId("booking-settings-savebar-save")).toBeEnabled()
  })

  it("saves the same PATCH payload (typed credentials only) and then reads as saved", async () => {
    renderSt(<BookingSettingsPage />)
    fireEvent.change(await screen.findByLabelText("Address"), { target: { value: "New st" } })
    fireEvent.change(screen.getByLabelText("BOG Client Secret"), { target: { value: "s3cret" } })
    expect(screen.getByTestId("booking-settings-savebar")).toHaveTextContent("You have unsaved changes")
    fireEvent.click(screen.getByTestId("booking-settings-savebar-save"))
    await waitFor(() => expect(s.patch).toHaveBeenCalledTimes(1))
    const [url, payload] = s.patch.mock.calls[0]
    expect(url).toBe("/api/bookings/admin/settings/")
    expect(payload).toMatchObject({ public_address: "New st", bog_client_secret: "s3cret", min_hours_before_booking: 2 })
    for (const k of ["id", "bog_client_id", "sms_api_key", "has_bog_client_id", "has_sms_api_key", "sms_sent_this_month"]) {
      expect(payload).not.toHaveProperty(k)
    }
    await waitFor(() => expect(screen.getByTestId("booking-settings-savebar")).toHaveTextContent("All changes saved"))
  })

  it("Discard goes back to the loaded values without a request", async () => {
    renderSt(<BookingSettingsPage />)
    const address = await screen.findByLabelText("Address")
    fireEvent.change(address, { target: { value: "Typo" } })
    fireEvent.click(screen.getByTestId("booking-settings-savebar-discard"))
    expect(screen.getByLabelText("Address")).toHaveValue("Main st")
    expect(s.patch).not.toHaveBeenCalled()
  })

  it("keeps Save disabled for non booking admins and after a failed load", async () => {
    s.isBookingAdmin = false
    const { unmount } = renderSt(<BookingSettingsPage />)
    expect(await screen.findByTestId("booking-settings-savebar-save")).toBeDisabled()
    unmount()
    s.isBookingAdmin = true
    s.get.mockRejectedValueOnce(new Error("down"))
    renderSt(<BookingSettingsPage />)
    expect(await screen.findByTestId("booking-settings-savebar-save")).toBeDisabled()
    expect(screen.getByTestId("booking-settings-savebar")).toHaveTextContent(/couldn.t be loaded|could not be loaded|load/i)
  })

  it("hides the BOG section when card payments are off and never sends a test SMS by itself", async () => {
    renderSt(<BookingSettingsPage />)
    await screen.findByText("Bank of Georgia Payment Gateway")
    fireEvent.click(screen.getByRole("switch", { name: "Allow Card Payment" }))
    expect(screen.queryByText("Bank of Georgia Payment Gateway")).toBeNull()
    fireEvent.click(screen.getByRole("switch", { name: "SMS notifications" }))
    expect(screen.getByLabelText("Send a test SMS")).toBeInTheDocument()
    expect(s.testSms).not.toHaveBeenCalled()
  })
})

describe("invoice settings FORM PAGE", () => {
  it("submits the same form from the save bar and shows the required error", async () => {
    renderSt(<InvoiceSettingsPage />)
    expect(screen.getByRole("heading", { name: "Invoice Settings" })).toBeInTheDocument()
    const name = await screen.findByLabelText("Company Name *")
    expect(name).toHaveValue("Demo LLC")
    fireEvent.change(name, { target: { value: "" } })
    await act(async () => {
      fireEvent.click(screen.getByTestId("invoice-settings-savebar-save"))
    })
    expect(await screen.findByText("This field is required")).toBeInTheDocument()
    expect(s.updateSettings).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText("Company Name *"), { target: { value: "New LLC" } })
    await act(async () => {
      fireEvent.click(screen.getByTestId("invoice-settings-savebar-save"))
    })
    await waitFor(() => expect(s.updateSettings).toHaveBeenCalledTimes(1))
    expect(s.updateSettings.mock.calls[0][0]).toMatchObject({ company_name: "New LLC", invoice_prefix: "INV", default_due_days: 30 })
    expect(s.updateSettings.mock.calls[0][0]).not.toHaveProperty("bank_accounts")
  })

  it("tabs switch the section; bank accounts have no save bar and save at once", async () => {
    renderSt(<InvoiceSettingsPage />)
    fireEvent.click(screen.getByRole("radio", { name: "Defaults" }))
    expect(screen.getByLabelText("Invoice Prefix")).toHaveValue("INV")
    fireEvent.click(screen.getByRole("radio", { name: "Bank Accounts" }))
    expect(screen.queryByTestId("invoice-settings-savebar")).toBeNull()
    expect(screen.getByText("TBC")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    await waitFor(() => expect(s.updateSettings).toHaveBeenCalledWith({ bank_accounts: [] }))
  })

  it("Discard resets the form to the loaded values", async () => {
    renderSt(<InvoiceSettingsPage />)
    const name = await screen.findByLabelText("Company Name *")
    fireEvent.change(name, { target: { value: "Changed" } })
    await waitFor(() => expect(screen.getByTestId("invoice-settings-savebar")).toHaveTextContent("You have unsaved changes"))
    await act(async () => {
      fireEvent.click(screen.getByTestId("invoice-settings-savebar-discard"))
    })
    expect(screen.getByLabelText("Company Name *")).toHaveValue("Demo LLC")
  })
})

describe("ST-05 translations", () => {
  const en = flatten(pending["st-05"].en)
  const ka = flatten(pending["st-05"].ka)
  it("has every key in en and ka", () => {
    expect(Object.keys(ka).sort()).toEqual(Object.keys(en).sort())
    for (const k of Object.keys(en)) expect(ka[k], k).toBeTruthy()
  })
  it("uses no Latin interface text in Georgian (identifier examples aside)", () => {
    for (const [k, v] of Object.entries(ka)) {
      let text = v.replace(/მაგ\., [a-z_]+/g, "")
      while (/\{[^{}]*\}/.test(text)) text = text.replace(/\{[^{}]*\}/g, "")
      expect(/[A-Za-z]/.test(text), `${k}: ${v}`).toBe(false)
    }
  })
  it("reaches the merged catalogs the pages read", () => {
    expect((messages.ka as any).settings.ticketFormsPage.customFields.title).toBe("დამატებითი ველები")
    expect((messages.en as any).bookingSettings.saveBar.saved).toBe("All changes saved")
  })
})
