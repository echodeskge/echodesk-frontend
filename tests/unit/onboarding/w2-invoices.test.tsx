/** ONB-W2 invoices step: draft from prefill/context, payload per SCHEMAS.md, nested errors, uploads. */
import React, { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"

const mocks = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock("@/api/axios", () => {
  const inst = { get: vi.fn(), post: (...a: unknown[]) => mocks.post(...a), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }
  return { default: inst, createAxiosInstance: () => inst, getApiUrl: () => "" }
})

import { InvoiceStep, initInvoiceAnswers, prepareInvoiceAnswers, numberPreview, type InvoiceAnswers } from "@/app/(tenant)/onboarding/_steps/invoice_management"
import { hasStepComponent, getStepDefinition } from "@/app/(tenant)/onboarding/_steps"
import { errorAt, rowErrorsAt } from "@/app/(tenant)/onboarding/_lib/nested-errors"
import type { FieldErrors } from "@/app/(tenant)/onboarding/_lib/onboarding-api"
import { renderOnb, step } from "./helpers"

const CONTEXT = {
  prefill_sources: { tenant_name: "Amanati", booking_bank: { bank_name: "TBC", bank_iban: "GE12TB0000000000000001", bank_account_holder: "Amanati LLC" } },
  has_logo: false,
  next_number_preview: "INV-2026-0001",
  itemlists: [{ id: 3, title: "Clients" }],
}

function Harness({ initial, errors = null, onChange = () => {}, context = CONTEXT }: { initial: InvoiceAnswers; errors?: FieldErrors | null; onChange?: (a: InvoiceAnswers) => void; context?: Record<string, unknown> }) {
  const [answers, set] = useState(initial)
  const setAnswers = (next: InvoiceAnswers | ((p: InvoiceAnswers) => InvoiceAnswers)) =>
    set((prev) => {
      const v = typeof next === "function" ? next(prev) : next
      onChange(v)
      return v
    })
  return <InvoiceStep step={step("invoice_management", 50)} answers={answers} setAnswers={setAnswers} errors={errors} context={context} prefill={{}} />
}

beforeEach(() => mocks.post.mockReset())

describe("invoice answers", () => {
  it("is registered", () => {
    expect(hasStepComponent("invoice_management")).toBe(true)
    expect(getStepDefinition("invoice_management").titleKey).toBe("steps.invoice_management.title")
  })

  it("init: company from tenant name, bank from the booking bank, Georgian e-mail templates, VAT on", () => {
    const a = initInvoiceAnswers({ answers: {}, prefill: {}, context: CONTEXT })
    expect(a.company.name).toBe("Amanati")
    expect(a.bank_accounts).toEqual([{ bank_name: "TBC", account_number: "", iban: "GE12TB0000000000000001", swift: "", is_default: true }])
    expect(a.defaults).toEqual({ vat_payer: true, default_tax_rate: "18.00", default_currency: "GEL", default_due_days: 14, invoice_prefix: "INV", starting_number: 1 })
    expect(a.email.email_subject_template).toContain("ინვოისი")
    expect(a.email.email_from_name).toBe("Amanati")
    expect(a.clients_source).toBe("none")
  })

  it("init: English templates when the context language is en; prefill rate 0 means no VAT", () => {
    const a = initInvoiceAnswers({ answers: {}, prefill: { defaults: { default_tax_rate: "0.00", invoice_prefix: "AM" } }, context: { ...CONTEXT, language: "en" } })
    expect(a.email.email_subject_template).toBe("Invoice {invoice_number} from {company_name}")
    expect(a.defaults.vat_payer).toBe(false)
    expect(a.defaults.default_tax_rate).toBe("0.00")
    expect(a.defaults.invoice_prefix).toBe("AM")
  })

  it("prepare emits the SCHEMAS.md payload: trimmed sections, one default bank, rate from the VAT toggle, empty sections omitted", () => {
    const a = initInvoiceAnswers({ answers: {}, prefill: {}, context: CONTEXT })
    const out = prepareInvoiceAnswers({
      ...a,
      company: { ...a.company, name: " Amanati LLC ", tax_id: "123", registration_number: "", address: "", phone: "", email: "", website: "" },
      defaults: { ...a.defaults, vat_payer: false, default_tax_rate: "18.00", invoice_prefix: " inv ", starting_number: 7 },
      bank_accounts: [
        { bank_name: "TBC", account_number: "", iban: "GE1", swift: "", is_default: false },
        { bank_name: "BOG", account_number: "", iban: "GE2", swift: "BAGAGE22", is_default: false },
        { bank_name: "", account_number: "", iban: "", swift: "", is_default: false },
      ],
      clients_source: "itemlist",
    })
    expect(out).toEqual({
      company: { name: "Amanati LLC", tax_id: "123", registration_number: "", address: "", phone: "", email: "", website: "" },
      defaults: { vat_payer: false, default_tax_rate: "0.00", default_currency: "GEL", default_due_days: 14, invoice_prefix: "inv", starting_number: 7 },
      bank_accounts: [
        { bank_name: "TBC", account_number: "", iban: "GE1", swift: "", is_default: true },
        { bank_name: "BOG", account_number: "", iban: "GE2", swift: "BAGAGE22", is_default: false },
      ],
      email: a.email,
      clients_source: "itemlist",
    })

    const bare = prepareInvoiceAnswers({
      ...a,
      company: { name: "", tax_id: "", registration_number: "", address: "", phone: "", email: "", website: "" },
      bank_accounts: [],
      email: { email_from: "", email_from_name: "", email_cc: "", email_subject_template: "", email_message_template: "", footer_text: "", default_terms: "" },
    })
    expect(Object.keys(bare).sort()).toEqual(["clients_source", "defaults"])
  })

  it("number preview follows the context pattern", () => {
    expect(numberPreview("INV-2026-0001", "AM", 12)).toBe("AM-2026-0012")
    expect(numberPreview("INV-2026-0001", "", 3)).toBe("2026-0003")
    expect(numberPreview("2026-000001", "X", null)).toBe("X-2026-000001")
  })
})

describe("InvoiceStep form", () => {
  it("renders the prefilled values, updates the preview and the VAT rate", () => {
    const onChange = vi.fn()
    renderOnb(<Harness initial={initInvoiceAnswers({ answers: {}, prefill: {}, context: CONTEXT })} onChange={onChange} />)
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as InvoiceAnswers

    expect(screen.getByTestId("onb-invoice-company-name-input")).toHaveValue("Amanati")
    expect(screen.getByTestId("onb-invoice-bank-row-0-iban")).toHaveValue("GE12TB0000000000000001")
    expect(screen.getByTestId("onb-invoice-preview")).toHaveTextContent("INV-2026-0001")

    fireEvent.change(screen.getByTestId("onb-invoice-prefix-input"), { target: { value: "am" } })
    fireEvent.change(screen.getByTestId("onb-invoice-starting-number-input"), { target: { value: "42" } })
    expect(last().defaults.invoice_prefix).toBe("AM")
    expect(screen.getByTestId("onb-invoice-preview")).toHaveTextContent("AM-2026-0042")

    fireEvent.click(screen.getByTestId("onb-invoice-vat-switch"))
    expect(last().defaults.vat_payer).toBe(false)
    expect(last().defaults.default_tax_rate).toBe("0.00")
    expect(screen.getByTestId("onb-invoice-tax-rate-input")).toBeDisabled()
    fireEvent.click(screen.getByTestId("onb-invoice-vat-switch"))
    expect(last().defaults.default_tax_rate).toBe("18.00")

    fireEvent.click(screen.getByTestId("onb-invoice-template-en"))
    expect(last().email.email_subject_template).toBe("Invoice {invoice_number} from {company_name}")

    fireEvent.click(screen.getByTestId("onb-invoice-clients-itemlist"))
    expect(last().clients_source).toBe("itemlist")
    expect(screen.getByTestId("onb-invoice-itemlists")).toHaveTextContent("Clients")
  })

  it("shows nested field errors next to the fields", () => {
    const errors = {
      defaults: { invoice_prefix: ["Only letters"], default_due_days: ["Too long"] },
      "company.tax_id": ["Nine digits"],
      bank_accounts: [{ iban: ["Invalid IBAN"] }],
      clients_source: ["Pick one"],
    }
    renderOnb(<Harness initial={initInvoiceAnswers({ answers: {}, prefill: {}, context: CONTEXT })} errors={errors} />)
    expect(screen.getByTestId("onb-invoice-prefix-error")).toHaveTextContent("Only letters")
    expect(screen.getByTestId("onb-invoice-due-days-error")).toHaveTextContent("Too long")
    expect(screen.getByTestId("onb-invoice-company-tax_id-error")).toHaveTextContent("Nine digits")
    expect(screen.getByTestId("onb-invoice-bank-row-0")).toHaveTextContent("Invalid IBAN")
    expect(screen.getByTestId("onb-invoice-clients-error")).toHaveTextContent("Pick one")
    expect(errorAt(errors, "defaults.invoice_prefix")).toBe("Only letters")
    expect(errorAt(errors, "bank_accounts[0].iban")).toBe("Invalid IBAN")
    expect(rowErrorsAt(errors, "bank_accounts")).toEqual([{ iban: ["Invalid IBAN"] }])
  })

  it("uploads logo / seal / signature through the invoice settings actions", async () => {
    mocks.post.mockResolvedValue({ data: { badge: "https://cdn/seal.png" } })
    renderOnb(<Harness initial={initInvoiceAnswers({ answers: {}, prefill: {}, context: CONTEXT })} />)
    const file = new File(["x"], "seal.png", { type: "image/png" })
    fireEvent.change(screen.getByTestId("onb-invoice-badge-input"), { target: { files: [file] } })
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1))
    const [url, body] = mocks.post.mock.calls[0]
    expect(url).toBe("/api/invoices/settings/upload-badge/")
    expect((body as FormData).get("badge")).toBe(file)
    await waitFor(() => expect(screen.getByTestId("onb-invoice-badge-preview").querySelector("img")).toHaveAttribute("src", "https://cdn/seal.png"))

    mocks.post.mockResolvedValue({ data: { logo: "https://cdn/logo.png" } })
    fireEvent.change(screen.getByTestId("onb-invoice-logo-input"), { target: { files: [file] } })
    await waitFor(() => expect(mocks.post).toHaveBeenLastCalledWith("/api/invoices/settings/upload-logo/", expect.any(FormData), expect.anything()))
    mocks.post.mockResolvedValue({ data: { signature: "https://cdn/sig.png" } })
    fireEvent.change(screen.getByTestId("onb-invoice-signature-input"), { target: { files: [file] } })
    await waitFor(() => expect(mocks.post).toHaveBeenLastCalledWith("/api/invoices/settings/upload-signature/", expect.any(FormData), expect.anything()))
  })
})
