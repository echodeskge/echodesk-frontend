/** ONB-W1 Bookings step: presets by industry, "me" preselected, touched sections in the payload, nested errors. */
import React, { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), access: { userId: 7 as number | undefined } }))
vi.mock("@/api/axios", () => ({ default: { get: (...a: unknown[]) => mocks.get(...a), post: (...a: unknown[]) => mocks.post(...a) } }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ loaded: true, userId: mocks.access.userId, isStaff: true, isSuperuser: false, has: () => false }) }))

import {
  BookingManagementStep,
  DEFAULT_PAYMENT,
  DEFAULT_REMINDERS,
  DEFAULT_RULES,
  formatPrice,
  initBookingAnswers,
  prepareBookingAnswers,
  servicePresets,
  type BookingAnswers,
} from "@/app/(tenant)/onboarding/_steps/booking_management"
import { getStepDefinition, hasStepComponent } from "@/app/(tenant)/onboarding/_steps"
import { defaultHours } from "@/app/(tenant)/onboarding/_components/fields"
import { onboardingKeys, type FieldErrors } from "@/app/(tenant)/onboarding/_lib/onboarding-api"
import { makeQueryClient, renderOnb, state, step } from "./helpers"

const USERS = [
  { id: 7, email: "me@x.ge", first_name: "Me", last_name: "" },
  { id: 8, email: "nino@x.ge", first_name: "Nino", last_name: "B" },
]
const CONTEXT = {
  users: USERS,
  existing: { services: 0, staff: 0 },
  service_presets: {
    salon: [
      { name: { ka: "თმის შეჭრა", en: "Haircut" }, duration_minutes: 45, price: "40", deposit_percentage: 20, category: { ka: "თმა", en: "Hair" } },
      { name: { ka: "მანიკური", en: "Manicure" }, duration_minutes: 60, price: 35.5, deposit_percentage: 0, category: null },
    ],
    other: [{ name: "Consultation", duration_minutes: 30, price: "0", deposit_percentage: 0 }],
  },
  public_url: "https://book.echodesk.ge/amanati",
}

function Harness({
  initial,
  errors = null,
  context = CONTEXT,
  onChange,
}: {
  initial: BookingAnswers
  errors?: FieldErrors | null
  context?: Record<string, unknown>
  onChange: (a: BookingAnswers) => void
}) {
  const [answers, set] = useState(initial)
  const setAnswers = (next: BookingAnswers | ((p: BookingAnswers) => BookingAnswers)) => {
    set((prev) => {
      const v = typeof next === "function" ? next(prev) : next
      onChange(v)
      return v
    })
  }
  return (
    <BookingManagementStep step={step("booking_management", 30, { context })} answers={answers} setAnswers={setAnswers} errors={errors} context={context} prefill={{}} />
  )
}

function renderWithIndustry(ui: React.ReactElement, industry: "salon" | "shop" | null) {
  const client = makeQueryClient()
  client.setQueryData(onboardingKeys.state(), state([step("booking_management", 30)], { industry }))
  return renderOnb(ui, { client })
}

beforeEach(() => {
  mocks.get.mockReset()
  mocks.post.mockReset()
  mocks.access.userId = 7
})

describe("booking answers", () => {
  it("is registered", () => {
    expect(hasStepComponent("booking_management")).toBe(true)
    expect(getStepDefinition("booking_management").titleKey).toBe("steps.booking_management.title")
  })

  it("init from prefill: sections untouched, defaults for missing keys, services normalised", () => {
    const a = initBookingAnswers({
      answers: {},
      prefill: {
        timezone: "Asia/Tbilisi",
        services: [{ name: "Haircut", duration_minutes: "45", price: 40, deposit_percentage: 10 }, { name: "" }],
        staff_user_ids: [8],
        payment: { method: "bog_gateway", bank_iban: "GE1" },
        rules: { refund_policy: "bogus", auto_confirm: false },
      },
    })
    expect(a.services).toEqual([{ name: { ka: "Haircut", en: "Haircut" }, duration_minutes: 45, price: "40.00", deposit_percentage: 10, category: null }])
    expect(a.staff_user_ids).toEqual([8])
    expect(a.payment).toEqual({ ...DEFAULT_PAYMENT, method: "bog_gateway", bank_iban: "GE1" })
    expect(a.rules).toEqual({ ...DEFAULT_RULES, auto_confirm: false })
    expect(a.reminders).toEqual(DEFAULT_REMINDERS)
    expect(a.public_page).toEqual({ enabled: true, description: { ka: "", en: "" }, address: "", phone: "" })
    expect(a._touched).toEqual([])
  })

  it("init from applied answers marks their sections as touched", () => {
    const a = initBookingAnswers({ answers: { payment: { method: "manual_transfer" }, public_page: { enabled: false } }, prefill: {} })
    expect(a._touched).toEqual(["payment", "public_page"])
    expect(a.public_page.enabled).toBe(false)
  })

  it("prepare sends the core keys always and the other sections only when touched", () => {
    const hours = defaultHours()
    const base = initBookingAnswers({ answers: {}, prefill: { hours, staff_user_ids: [7, 7] } })
    const draft: BookingAnswers = {
      ...base,
      services: [
        { name: { ka: " თმის შეჭრა ", en: "Haircut" }, duration_minutes: 45, price: "40", deposit_percentage: 120, category: { ka: "", en: " Hair " } },
        { name: { ka: "", en: "" }, duration_minutes: 10, price: "1", deposit_percentage: 0, category: null },
        { name: { ka: "", en: "Wash" }, duration_minutes: null, price: "", deposit_percentage: null, category: { ka: "", en: "" } },
      ],
    }
    const core = prepareBookingAnswers(draft)
    expect(core).toEqual({
      timezone: "Asia/Tbilisi",
      hours,
      services: [
        { name: { ka: "თმის შეჭრა", en: "Haircut" }, duration_minutes: 45, price: "40.00", deposit_percentage: 100, category: { ka: "", en: "Hair" } },
        { name: { ka: "", en: "Wash" }, duration_minutes: 60, price: "0.00", deposit_percentage: 0, category: null },
      ],
      staff_user_ids: [7],
    })

    const full = prepareBookingAnswers({
      ...draft,
      payment: { ...DEFAULT_PAYMENT, method: "manual_transfer", bank_name: " TBC ", bank_iban: "ge12 tb00 0000", bank_account_holder: "Amanati LLC", require_deposit: true },
      rules: { min_hours_before_booking: 3, max_days_advance_booking: 400, cancellation_hours_before: 12, refund_policy: "partial_50", auto_confirm: false },
      reminders: { ...DEFAULT_REMINDERS, reminder_hours_before: 48, second_reminder_hours_before: 2, sms_enabled: true, sms_api_key: " key ", sms_on_cancelled: false },
      public_page: { enabled: true, description: { ka: "სალონი", en: " Salon " }, address: " Tbilisi ", phone: "+995 5" },
      _touched: ["payment", "rules", "reminders", "public_page"],
    })
    expect(full).toEqual({
      ...core,
      payment: {
        method: "manual_transfer",
        allow_cash: true,
        allow_card: true,
        require_deposit: true,
        bank_name: "TBC",
        bank_iban: "GE12TB000000",
        bank_account_holder: "Amanati LLC",
        bog_client_id: null,
        bog_client_secret: null,
        bog_use_production: false,
      },
      rules: { min_hours_before_booking: 3, max_days_advance_booking: 365, cancellation_hours_before: 12, refund_policy: "partial_50", auto_confirm: false },
      reminders: {
        reminder_hours_before: 48,
        second_reminder_hours_before: 2,
        sms_enabled: true,
        sms_api_key: "key",
        sms_on_created: true,
        sms_on_confirmed: true,
        sms_on_rescheduled: true,
        sms_on_cancelled: false,
        sms_on_reminder: true,
      },
      public_page: { enabled: true, description: { ka: "სალონი", en: "Salon" }, address: "Tbilisi", phone: "+995 5" },
    })
    expect("_touched" in full).toBe(false)
    expect(Object.keys(full).sort()).toEqual(["hours", "payment", "public_page", "reminders", "rules", "services", "staff_user_ids", "timezone"])
  })

  it("helpers: price formatting and presets by industry with the `other` fallback", () => {
    expect(formatPrice("25")).toBe("25.00")
    expect(formatPrice(35.5)).toBe("35.50")
    expect(formatPrice("")).toBe("")
    expect(servicePresets(CONTEXT, "salon").map((s) => s.name.en)).toEqual(["Haircut", "Manicure"])
    expect(servicePresets(CONTEXT, "salon")[1].price).toBe("35.50")
    expect(servicePresets(CONTEXT, "shop").map((s) => s.name.en)).toEqual(["Consultation"])
    expect(servicePresets({}, "salon")).toEqual([])
  })
})

describe("BookingManagementStep", () => {
  const initial = initBookingAnswers({ answers: {}, prefill: {} })

  it("seeds the industry services and the current user, then builds the sections (touched only)", () => {
    const onChange = vi.fn()
    renderWithIndustry(<Harness initial={initial} onChange={onChange} />, "salon")
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as BookingAnswers

    expect(screen.getByTestId("onb-bookings-services-row-0-name-en")).toHaveValue("Haircut")
    expect(screen.getByTestId("onb-bookings-services-row-1-name-ka")).toHaveValue("მანიკური")
    expect(last().staff_user_ids).toEqual([7])
    expect(screen.getByTestId("onb-bookings-staff-user-7")).toHaveAttribute("aria-selected", "true")
    expect(last()._touched).toEqual([])
    expect(mocks.get).not.toHaveBeenCalled()

    expect(screen.getByTestId("onb-bookings-public-url")).toHaveTextContent("book.echodesk.ge/amanati")

    // Edit a service row + add one.
    fireEvent.change(screen.getByTestId("onb-bookings-services-row-0-price"), { target: { value: "45" } })
    fireEvent.click(screen.getByTestId("onb-bookings-services-add"))
    fireEvent.change(screen.getByTestId("onb-bookings-services-row-2-name-en"), { target: { value: "Wash" } })
    expect(last().services[0].price).toBe("45")
    expect(last().services[2].name.en).toBe("Wash")

    // Payment: BOG hides the bank fields and shows the collapsed credentials.
    expect(screen.getByTestId("onb-bookings-bank")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("radio", { name: /Online card/ }))
    expect(screen.queryByTestId("onb-bookings-bank")).toBeNull()
    expect(screen.queryByTestId("onb-bookings-bog-id")).toBeNull()
    fireEvent.click(screen.getByTestId("onb-bookings-bog-toggle"))
    fireEvent.change(screen.getByTestId("onb-bookings-bog-id-input"), { target: { value: "cid" } })
    fireEvent.change(screen.getByTestId("onb-bookings-bog-secret-input"), { target: { value: "sec" } })
    expect(screen.getByTestId("onb-bookings-bog-secret-input")).toHaveAttribute("type", "password")
    expect(last().payment).toMatchObject({ method: "bog_gateway", bog_client_id: "cid", bog_client_secret: "sec" })
    expect(last()._touched).toEqual(["payment"])

    // Reminders: SMS toggle reveals the key and the event toggles.
    expect(screen.queryByTestId("onb-bookings-sms-options")).toBeNull()
    fireEvent.click(screen.getByTestId("onb-bookings-sms-switch"))
    fireEvent.change(screen.getByTestId("onb-bookings-sms-key-input"), { target: { value: "k" } })
    fireEvent.click(screen.getByTestId("onb-bookings-sms_on_cancelled-switch"))
    expect(last().reminders).toMatchObject({ sms_enabled: true, sms_api_key: "k", sms_on_cancelled: false })

    // Rules + public page.
    fireEvent.change(screen.getByTestId("onb-bookings-refund-select"), { target: { value: "no_refund" } })
    fireEvent.click(screen.getByTestId("onb-bookings-auto-confirm-switch"))
    fireEvent.change(screen.getByTestId("onb-bookings-public-phone-input"), { target: { value: "+995 5" } })
    expect(last().rules).toMatchObject({ refund_policy: "no_refund", auto_confirm: false })
    expect(last()._touched).toEqual(["payment", "reminders", "rules", "public_page"])

    const payload = prepareBookingAnswers(last())
    expect(payload.payment).toMatchObject({ method: "bog_gateway", bog_client_id: "cid", bog_client_secret: "sec", bank_name: "" })
    expect(payload.reminders).toMatchObject({ sms_enabled: true, sms_api_key: "k", sms_on_cancelled: false })
    expect(payload.rules).toMatchObject({ refund_policy: "no_refund", auto_confirm: false })
    expect(payload.public_page).toMatchObject({ phone: "+995 5", enabled: true })
  })

  it("keeps prefilled services and staff, and reloads the presets on demand", () => {
    const onChange = vi.fn()
    const prefilled = initBookingAnswers({ answers: {}, prefill: { services: [{ name: "Existing", duration_minutes: 30, price: "10" }], staff_user_ids: [8] } })
    renderWithIndustry(<Harness initial={prefilled} onChange={onChange} />, "salon")
    expect(screen.getByTestId("onb-bookings-services-row-0-name-en")).toHaveValue("Existing")
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId("onb-bookings-load-presets"))
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as BookingAnswers
    expect(last.services.map((s) => s.name.en)).toEqual(["Haircut", "Manicure"])
    expect(last.staff_user_ids).toEqual([8])
  })

  it("renders nested and row errors next to their fields", () => {
    const withRows = { ...initial, services: [initial.services[0] ?? { name: { ka: "", en: "A" }, duration_minutes: 30, price: "1", deposit_percentage: 0, category: null }, { name: { ka: "", en: "B" }, duration_minutes: 30, price: "", deposit_percentage: 0, category: null }, { name: { ka: "", en: "C" }, duration_minutes: 30, price: "x", deposit_percentage: 0, category: null }] }
    renderWithIndustry(
      <Harness
        initial={withRows}
        errors={{
          payment: { bank_iban: ["Invalid IBAN"] },
          services: [{}, {}, { price: ["Enter a price"] }],
          rules: { max_days_advance_booking: ["Too far ahead"] },
          reminders: { sms_api_key: ["Key required"] },
          public_page: { description: { ka: ["Required"] } },
          staff_user_ids: ["Pick someone"],
        }}
        onChange={() => {}}
      />,
      null
    )
    expect(screen.getByTestId("onb-bookings-bank-iban-error")).toHaveTextContent("Invalid IBAN")
    expect(screen.getByTestId("onb-bookings-services-row-2")).toHaveTextContent("Enter a price")
    expect(screen.getByTestId("onb-bookings-services-row-1")).not.toHaveTextContent("Enter a price")
    expect(screen.getByTestId("onb-bookings-max-days-error")).toHaveTextContent("Too far ahead")
    expect(screen.getByTestId("onb-bookings-public-description-error")).toHaveTextContent("Required")
    expect(screen.getByTestId("onb-bookings-staff-error")).toHaveTextContent("Pick someone")
    // The SMS key error shows once the SMS options are open.
    expect(screen.queryByTestId("onb-bookings-sms-key-error")).toBeNull()
    fireEvent.click(screen.getByTestId("onb-bookings-sms-switch"))
    expect(screen.getByTestId("onb-bookings-sms-key-error")).toHaveTextContent("Key required")
  })
})
