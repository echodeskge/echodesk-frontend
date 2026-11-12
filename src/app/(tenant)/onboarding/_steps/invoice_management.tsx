"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { FileSignature, ImageIcon, ListChecks, ShoppingBag, Stamp, Upload, XCircle } from "lucide-react"
import axios from "@/api/axios"
import { useToast } from "@/hooks/use-toast"
import { rdButton } from "@/components/redesign/buttons"
import { SectionCard } from "@/components/redesign/section-card"
import { cn } from "@/lib/utils"
import type { OnboardingStep } from "../_lib/onboarding-api"
import { errorAt, listErrorAt, rowErrorsAt } from "../_lib/nested-errors"
import { EditableTable, MultiChoiceCards, NumberField, SelectField, TextField, Toggle, inputClass } from "../_components/fields"
import type { StepComponentProps, StepDefinition } from "./types"

/**
 * SCHEMAS.md `invoice_management`:
 * {"company": {name, tax_id, registration_number, address, phone, email, website},
 *  "defaults": {vat_payer, default_tax_rate: "18.00", default_currency, default_due_days, invoice_prefix, starting_number},
 *  "bank_accounts": [{bank_name, account_number, iban, swift, is_default}],
 *  "email": {email_from, email_from_name, email_cc, email_subject_template, email_message_template, footer_text, default_terms},
 *  "clients_source": "ecommerce" | "itemlist" | "none"}
 * context = {prefill_sources: {tenant_name, booking_bank}, has_logo, next_number_preview, itemlists: [{id,title}]}
 * Logo / seal / signature go through `/api/invoices/settings/upload-{logo,badge,signature}/`.
 */
export type Currency = "GEL" | "USD" | "EUR"
export type ClientsSource = "ecommerce" | "itemlist" | "none"
export type TemplateLanguage = "ka" | "en"

export interface InvoiceCompany {
  name: string
  tax_id: string
  registration_number: string
  address: string
  phone: string
  email: string
  website: string
}

export interface InvoiceDefaults {
  vat_payer: boolean
  default_tax_rate: string
  default_currency: Currency
  default_due_days: number | null
  invoice_prefix: string
  starting_number: number | null
}

export interface BankAccountRow {
  bank_name: string
  account_number: string
  iban: string
  swift: string
  is_default: boolean
}

export interface InvoiceEmail {
  email_from: string
  email_from_name: string
  email_cc: string
  email_subject_template: string
  email_message_template: string
  footer_text: string
  default_terms: string
}

export interface InvoiceAnswers {
  company: InvoiceCompany
  defaults: InvoiceDefaults
  bank_accounts: BankAccountRow[]
  email: InvoiceEmail
  clients_source: ClientsSource
  [key: string]: unknown
}

export const CURRENCIES: Currency[] = ["GEL", "USD", "EUR"]
const SOURCES: ClientsSource[] = ["ecommerce", "itemlist", "none"]
export const VAT_RATE = "18.00"
export const NO_VAT_RATE = "0.00"

/** Default subject / body / footer / terms per language (the backend renders `{placeholders}`). */
export const EMAIL_TEMPLATES: Record<TemplateLanguage, Pick<InvoiceEmail, "email_subject_template" | "email_message_template" | "footer_text" | "default_terms">> = {
  en: {
    email_subject_template: "Invoice {invoice_number} from {company_name}",
    email_message_template:
      "Dear {client_name},\n\nPlease find attached invoice {invoice_number} for {total_amount}, due on {due_date}.\n\nThank you for your business.\n{company_name}",
    footer_text: "Thank you for your business.",
    default_terms: "Payment is due within {due_days} days of the invoice date.",
  },
  ka: {
    email_subject_template: "ინვოისი {invoice_number} — {company_name}",
    email_message_template:
      "ძვირფასო {client_name},\n\nგიგზავნით ინვოისს {invoice_number} თანხით {total_amount}, გადახდის ვადა — {due_date}.\n\nგმადლობთ თანამშრომლობისთვის.\n{company_name}",
    footer_text: "გმადლობთ თანამშრომლობისთვის.",
    default_terms: "გადახდა უნდა განხორციელდეს ინვოისის თარიღიდან {due_days} დღის განმავლობაში.",
  },
}

export function emptyBankRow(): BankAccountRow {
  return { bank_name: "", account_number: "", iban: "", swift: "", is_default: false }
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback)
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback)
const int = (v: unknown, fallback: number | null): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Math.trunc(Number(v))
  return fallback
}
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** "18" / 18 / "18.5" → "18.00" / "18.50"; anything else → fallback. */
export function moneyRate(v: unknown, fallback: string): string {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN
  return Number.isFinite(n) ? n.toFixed(2) : fallback
}

/** `INV-2026-0001` from the context pattern and the current prefix / number. */
export function numberPreview(pattern: unknown, prefix: string, startingNumber: number | null): string {
  const p = typeof pattern === "string" && pattern ? pattern : "INV-2026-0001"
  const m = p.match(/^(.*?)-?(\d{4})-(\d+)$/)
  const year = m ? m[2] : String(new Date().getUTCFullYear())
  const width = m ? m[3].length : 4
  const n = startingNumber ?? 1
  const num = String(Math.max(0, n)).padStart(width, "0")
  const pre = prefix.trim()
  return pre ? `${pre}-${year}-${num}` : `${year}-${num}`
}

function bankRow(r: Record<string, unknown>): BankAccountRow {
  return {
    bank_name: str(r.bank_name),
    account_number: str(r.account_number),
    iban: str(r.iban),
    swift: str(r.swift),
    is_default: bool(r.is_default, false),
  }
}

/** Draft: last answers else prefill; company name and bank from `context.prefill_sources`; e-mail templates per language. */
export function initInvoiceAnswers(step: Pick<OnboardingStep, "answers" | "prefill" | "context">): InvoiceAnswers {
  const src = (Object.keys(step.answers ?? {}).length ? step.answers : step.prefill) ?? {}
  const ctx = step.context ?? {}
  const sources = rec(ctx.prefill_sources)
  const company = rec(src.company)
  const defaults = rec(src.defaults)
  const email = rec(src.email)
  const langRaw = str(ctx.language, str(sources.language, "ka"))
  const lang: TemplateLanguage = langRaw === "en" ? "en" : "ka"
  const tpl = EMAIL_TEMPLATES[lang]

  const rate = moneyRate(defaults.default_tax_rate, VAT_RATE)
  const vatPayer = bool(defaults.vat_payer, Number(rate) > 0)
  const currency = str(defaults.default_currency)

  let bank: BankAccountRow[] = Array.isArray(src.bank_accounts) ? src.bank_accounts.map((r) => bankRow(rec(r))) : []
  if (bank.length === 0) {
    const bb = rec(sources.booking_bank)
    const row: BankAccountRow = {
      bank_name: str(bb.bank_name),
      account_number: str(bb.account_number, str(bb.bank_account_number)),
      iban: str(bb.iban, str(bb.bank_iban)),
      swift: str(bb.swift, str(bb.bank_swift)),
      is_default: true,
    }
    if (row.bank_name || row.iban || row.account_number) bank = [row]
  }

  const source = str(src.clients_source)
  return {
    company: {
      name: str(company.name, str(sources.tenant_name)),
      tax_id: str(company.tax_id),
      registration_number: str(company.registration_number),
      address: str(company.address),
      phone: str(company.phone),
      email: str(company.email),
      website: str(company.website),
    },
    defaults: {
      vat_payer: vatPayer,
      default_tax_rate: vatPayer ? rate : NO_VAT_RATE,
      default_currency: (CURRENCIES as string[]).includes(currency) ? (currency as Currency) : "GEL",
      default_due_days: int(defaults.default_due_days, 14),
      invoice_prefix: str(defaults.invoice_prefix, "INV"),
      starting_number: int(defaults.starting_number, 1),
    },
    bank_accounts: bank,
    email: {
      email_from: str(email.email_from),
      email_from_name: str(email.email_from_name, str(company.name, str(sources.tenant_name))),
      email_cc: str(email.email_cc),
      email_subject_template: str(email.email_subject_template, tpl.email_subject_template),
      email_message_template: str(email.email_message_template, tpl.email_message_template),
      footer_text: str(email.footer_text, tpl.footer_text),
      default_terms: str(email.default_terms, tpl.default_terms),
    },
    clients_source: (SOURCES as string[]).includes(source) ? (source as ClientsSource) : "none",
  }
}

const trimAll = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])) as T
const allEmpty = (o: object) => Object.values(o).every((v) => !v)

/** Payload: trimmed, empty sections omitted, exactly one default bank account, rate as "18.00". */
export function prepareInvoiceAnswers(a: InvoiceAnswers): InvoiceAnswers {
  const out: Record<string, unknown> = {}
  const company = trimAll(a.company)
  if (!allEmpty(company)) out.company = company

  out.defaults = {
    vat_payer: a.defaults.vat_payer,
    default_tax_rate: a.defaults.vat_payer ? moneyRate(a.defaults.default_tax_rate, VAT_RATE) : NO_VAT_RATE,
    default_currency: a.defaults.default_currency,
    default_due_days: a.defaults.default_due_days ?? 14,
    invoice_prefix: a.defaults.invoice_prefix.trim(),
    starting_number: a.defaults.starting_number ?? 1,
  }

  const bank = a.bank_accounts
    .map((r) => ({ ...trimAll({ bank_name: r.bank_name, account_number: r.account_number, iban: r.iban, swift: r.swift }), is_default: r.is_default }))
    .filter((r) => r.bank_name || r.iban || r.account_number)
  if (bank.length) {
    const firstDefault = bank.findIndex((r) => r.is_default)
    const keep = firstDefault === -1 ? 0 : firstDefault
    out.bank_accounts = bank.map((r, i) => ({ ...r, is_default: i === keep }))
  }

  const email = trimAll(a.email)
  if (!allEmpty(email)) out.email = email

  out.clients_source = a.clients_source
  return out as InvoiceAnswers
}

type BrandingKind = "logo" | "badge" | "signature"
const BRANDING_FIELD: Record<BrandingKind, string> = { logo: "logo", badge: "badge", signature: "signature" }
const BRANDING_ICON = { logo: ImageIcon, badge: Stamp, signature: FileSignature } as const

/** Existing invoice settings upload actions; the response is the settings row with the file URLs. */
export async function uploadInvoiceAsset(kind: BrandingKind, file: File): Promise<string | null> {
  const form = new FormData()
  form.append(BRANDING_FIELD[kind], file)
  const res = await axios.post<Record<string, unknown>>(`/api/invoices/settings/upload-${kind}/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  const data = res.data ?? {}
  const url = data[kind] ?? data[`${kind}_url`]
  return typeof url === "string" && url ? url : null
}

function BrandingUpload({ kind, initialUrl }: { kind: BrandingKind; initialUrl: string | null }) {
  const t = useTranslations("onboarding.invoices.branding")
  const { toast } = useToast()
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const Icon = BRANDING_ICON[kind]
  const inputId = `onb-invoice-${kind}-file`

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const next = await uploadInvoiceAsset(kind, file)
      setUrl(next ?? URL.createObjectURL(file))
      toast({ title: t("uploaded") })
    } catch {
      toast({ title: t("failed"), variant: "destructive" })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-3" data-testid={`onb-invoice-${kind}`}>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border bg-muted/40" data-testid={`onb-invoice-${kind}-preview`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={t(kind)} className="max-h-full max-w-full object-contain" />
        ) : (
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[13px] font-medium">{t(kind)}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="sr-only"
          id={inputId}
          onChange={(e) => onFile(e.target.files?.[0])}
          data-testid={`onb-invoice-${kind}-input`}
        />
        <label htmlFor={inputId} className={cn(rdButton.outlineSm, "w-fit cursor-pointer", busy && "pointer-events-none opacity-50")}>
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {busy ? t("uploading") : url ? t("change") : t("upload")}
        </label>
      </div>
    </div>
  )
}

export function InvoiceStep({ answers, setAnswers, errors, context }: StepComponentProps<InvoiceAnswers>) {
  const t = useTranslations("onboarding.invoices")
  const patch = <K extends "company" | "defaults" | "email">(section: K, p: Partial<InvoiceAnswers[K]>) =>
    setAnswers((prev) => ({ ...prev, [section]: { ...prev[section], ...p } }))

  const preview = numberPreview(context.next_number_preview, answers.defaults.invoice_prefix, answers.defaults.starting_number)
  const logoUrl = typeof context.logo_url === "string" ? context.logo_url : null
  const itemlists = Array.isArray(context.itemlists) ? (context.itemlists as Array<{ id: number; title: string }>) : []

  const applyTemplate = (lang: TemplateLanguage) => patch("email", EMAIL_TEMPLATES[lang])

  const companyField = (key: keyof InvoiceCompany, opts: { type?: "text" | "email" | "tel" | "url"; placeholder?: string; autoComplete?: string } = {}) => (
    <TextField
      label={t(`company.${key}`)}
      value={answers.company[key]}
      onChange={(v) => patch("company", { [key]: v } as Partial<InvoiceCompany>)}
      error={errorAt(errors, `company.${key}`)}
      type={opts.type}
      placeholder={opts.placeholder}
      autoComplete={opts.autoComplete}
      testId={`onb-invoice-company-${key}`}
    />
  )

  return (
    <div className="flex flex-col gap-4" data-testid="onb-step-invoice_management">
      <SectionCard title={t("company.title")} hint={t("company.hint")} bodyClassName="grid gap-4 p-4 sm:grid-cols-2">
        {companyField("name", { autoComplete: "organization" })}
        {companyField("tax_id", { placeholder: "123456789" })}
        {companyField("registration_number")}
        {companyField("phone", { type: "tel", placeholder: "+995 ..." })}
        {companyField("email", { type: "email", placeholder: "billing@company.ge" })}
        {companyField("website", { type: "url", placeholder: "https://" })}
        <TextField
          label={t("company.address")}
          value={answers.company.address}
          onChange={(v) => patch("company", { address: v })}
          error={errorAt(errors, "company.address")}
          className="sm:col-span-2"
          testId="onb-invoice-company-address"
        />
      </SectionCard>

      <SectionCard title={t("defaults.title")} hint={t("defaults.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <Toggle
          label={t("defaults.vatPayer")}
          help={t("defaults.vatPayerHint")}
          checked={answers.defaults.vat_payer}
          onChange={(on) => patch("defaults", { vat_payer: on, default_tax_rate: on ? VAT_RATE : NO_VAT_RATE })}
          error={errorAt(errors, "defaults.vat_payer")}
          testId="onb-invoice-vat"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label={t("defaults.taxRate")}
            value={answers.defaults.vat_payer ? Number(answers.defaults.default_tax_rate) : 0}
            onChange={(v) => patch("defaults", { default_tax_rate: moneyRate(v, VAT_RATE) })}
            min={0}
            max={100}
            step={0.5}
            suffix="%"
            disabled={!answers.defaults.vat_payer}
            error={errorAt(errors, "defaults.default_tax_rate")}
            testId="onb-invoice-tax-rate"
          />
          <SelectField
            label={t("defaults.currency")}
            value={answers.defaults.default_currency}
            onChange={(v) => patch("defaults", { default_currency: v })}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            error={errorAt(errors, "defaults.default_currency")}
            testId="onb-invoice-currency"
          />
          <NumberField
            label={t("defaults.dueDays")}
            value={answers.defaults.default_due_days}
            onChange={(v) => patch("defaults", { default_due_days: v })}
            min={0}
            max={365}
            suffix={t("defaults.days")}
            error={errorAt(errors, "defaults.default_due_days")}
            testId="onb-invoice-due-days"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label={t("defaults.prefix")}
            value={answers.defaults.invoice_prefix}
            onChange={(v) => patch("defaults", { invoice_prefix: v.toUpperCase() })}
            placeholder="INV"
            error={errorAt(errors, "defaults.invoice_prefix")}
            testId="onb-invoice-prefix"
          />
          <NumberField
            label={t("defaults.startingNumber")}
            value={answers.defaults.starting_number}
            onChange={(v) => patch("defaults", { starting_number: v })}
            min={1}
            error={errorAt(errors, "defaults.starting_number")}
            testId="onb-invoice-starting-number"
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">{t("defaults.preview")}</span>
            <code className="inline-flex h-[34px] items-center rounded-md border bg-muted px-3 font-mono text-[13px]" data-testid="onb-invoice-preview">
              {preview}
            </code>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("bank.title")} hint={t("bank.hint")} bodyClassName="p-4">
        <EditableTable<BankAccountRow>
          columns={[
            { key: "bank_name", label: t("bank.bankName"), placeholder: t("bank.bankNamePlaceholder"), width: "minmax(0,1.2fr)" },
            { key: "iban", label: "IBAN", placeholder: "GE00XX0000000000000000", width: "minmax(0,1.6fr)" },
            { key: "account_number", label: t("bank.accountNumber") },
            { key: "swift", label: "SWIFT", width: "110px" },
            {
              key: "is_default",
              label: t("bank.default"),
              type: "custom",
              width: "70px",
              render: (row, _update, index) => (
                <input
                  type="radio"
                  name="onb-invoice-bank-default"
                  checked={row.is_default}
                  aria-label={t("bank.default")}
                  onChange={() => setAnswers((prev) => ({ ...prev, bank_accounts: prev.bank_accounts.map((r, i) => ({ ...r, is_default: i === index })) }))}
                  className="mt-2 h-4 w-4 accent-primary"
                  data-testid={`onb-invoice-bank-row-${index}-default`}
                />
              ),
            },
          ]}
          rows={answers.bank_accounts}
          onChange={(rows) => setAnswers((prev) => ({ ...prev, bank_accounts: rows }))}
          newRow={() => ({ ...emptyBankRow(), is_default: answers.bank_accounts.length === 0 })}
          rowErrors={rowErrorsAt(errors, "bank_accounts")}
          error={listErrorAt(errors, "bank_accounts")}
          addLabel={t("bank.add")}
          emptyText={t("bank.empty")}
          testId="onb-invoice-bank"
        />
      </SectionCard>

      <SectionCard title={t("branding.title")} hint={t("branding.hint")} bodyClassName="grid gap-4 p-4 sm:grid-cols-3">
        <BrandingUpload kind="logo" initialUrl={logoUrl} />
        <BrandingUpload kind="badge" initialUrl={null} />
        <BrandingUpload kind="signature" initialUrl={null} />
      </SectionCard>

      <SectionCard
        title={t("email.title")}
        hint={t("email.hint")}
        actions={
          <div className="flex items-center gap-1.5" role="group" aria-label={t("email.template")}>
            {(["ka", "en"] as TemplateLanguage[]).map((lang) => (
              <button key={lang} type="button" className={rdButton.outlineSm} onClick={() => applyTemplate(lang)} data-testid={`onb-invoice-template-${lang}`}>
                {t(lang === "ka" ? "email.templateKa" : "email.templateEn")}
              </button>
            ))}
          </div>
        }
        bodyClassName="flex flex-col gap-4 p-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label={t("email.fromName")}
            value={answers.email.email_from_name}
            onChange={(v) => patch("email", { email_from_name: v })}
            error={errorAt(errors, "email.email_from_name")}
            testId="onb-invoice-email-from-name"
          />
          <TextField
            label={t("email.from")}
            type="email"
            value={answers.email.email_from}
            onChange={(v) => patch("email", { email_from: v })}
            placeholder="billing@company.ge"
            error={errorAt(errors, "email.email_from")}
            testId="onb-invoice-email-from"
          />
          <TextField
            label={t("email.cc")}
            type="email"
            value={answers.email.email_cc}
            onChange={(v) => patch("email", { email_cc: v })}
            error={errorAt(errors, "email.email_cc")}
            testId="onb-invoice-email-cc"
          />
        </div>
        <TextField
          label={t("email.subject")}
          help={t("email.placeholders")}
          value={answers.email.email_subject_template}
          onChange={(v) => patch("email", { email_subject_template: v })}
          error={errorAt(errors, "email.email_subject_template")}
          testId="onb-invoice-email-subject"
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("email.message")}</span>
          <textarea
            rows={5}
            value={answers.email.email_message_template}
            onChange={(e) => patch("email", { email_message_template: e.target.value })}
            aria-invalid={errorAt(errors, "email.email_message_template") ? true : undefined}
            className={cn(inputClass, "h-auto min-h-[110px] py-2")}
            data-testid="onb-invoice-email-message"
          />
          {errorAt(errors, "email.email_message_template") && (
            <span role="alert" className="text-xs text-destructive">
              {errorAt(errors, "email.email_message_template")}
            </span>
          )}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("email.footer")}
            value={answers.email.footer_text}
            onChange={(v) => patch("email", { footer_text: v })}
            error={errorAt(errors, "email.footer_text")}
            testId="onb-invoice-email-footer"
          />
          <TextField
            label={t("email.terms")}
            value={answers.email.default_terms}
            onChange={(v) => patch("email", { default_terms: v })}
            error={errorAt(errors, "email.default_terms")}
            testId="onb-invoice-email-terms"
          />
        </div>
      </SectionCard>

      <SectionCard title={t("clients.title")} hint={t("clients.hint")} bodyClassName="flex flex-col gap-3 p-4">
        <MultiChoiceCards
          options={[
            { value: "ecommerce", label: t("clients.ecommerce"), description: t("clients.ecommerceHint"), icon: ShoppingBag },
            { value: "itemlist", label: t("clients.itemlist"), description: t("clients.itemlistHint"), icon: ListChecks },
            { value: "none", label: t("clients.none"), description: t("clients.noneHint"), icon: XCircle },
          ]}
          value={answers.clients_source}
          onChange={(v) => setAnswers((prev) => ({ ...prev, clients_source: v }))}
          columns={3}
          error={errorAt(errors, "clients_source")}
          testId="onb-invoice-clients"
        />
        {answers.clients_source === "itemlist" && itemlists.length > 0 && (
          <span className="text-xs text-muted-foreground" data-testid="onb-invoice-itemlists">
            {t("clients.existingLists", { lists: itemlists.map((l) => l.title).join(", ") })}
          </span>
        )}
      </SectionCard>
    </div>
  )
}

export const step: StepDefinition<InvoiceAnswers> = {
  key: "invoice_management",
  titleKey: "steps.invoice_management.title",
  Component: InvoiceStep,
  init: initInvoiceAnswers,
  prepare: prepareInvoiceAnswers,
}
