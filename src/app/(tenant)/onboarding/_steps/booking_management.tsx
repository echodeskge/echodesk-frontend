"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Banknote, ChevronDown, CreditCard, ExternalLink, Sparkles } from "lucide-react"
import { useMyAccess } from "@/hooks/useMyAccess"
import { rdButton } from "@/components/redesign/buttons"
import { SectionCard } from "@/components/redesign/section-card"
import { Segmented } from "@/components/redesign/segmented"
import { cn } from "@/lib/utils"
import { firstError, nestedError, rowErrorsOf, useOnboardingIndustry, type OnboardingStep } from "../_lib/onboarding-api"
import {
  DEFAULT_TIMEZONE,
  EMPTY_I18N,
  EditableTable,
  HoursGrid,
  I18nTextField,
  NumberField,
  SecretField,
  SelectField,
  TextField,
  TimezoneField,
  Toggle,
  UsersPicker,
  inputClass,
  normalizeHours,
  type HoursValue,
  type I18nText,
} from "../_components/fields"
import type { StepComponentProps, StepDefinition } from "./types"

/**
 * Bookings step (SCHEMAS.md `booking_management`):
 * {"timezone", "hours": Hours, "services": [{name: I18n, duration_minutes, price: "25.00", deposit_percentage, category: I18n|null}],
 *  "staff_user_ids": [id], "payment": {...}, "rules": {...}, "reminders": {...}, "public_page": {...}}
 * The core keys are always sent; `payment` / `rules` / `reminders` /
 * `public_page` only when the user touched them in this draft or they were
 * applied before (draft-only `_touched` list, stripped by `prepare`).
 */
export type PaymentMethod = "manual_transfer" | "bog_gateway"
export type RefundPolicy = "full" | "partial_50" | "partial_25" | "no_refund"
export type BookingSection = "payment" | "rules" | "reminders" | "public_page"

export interface ServiceRow {
  name: I18nText
  duration_minutes: number | null
  price: string
  deposit_percentage: number | null
  category: I18nText | null
}

export interface PaymentAnswers {
  method: PaymentMethod
  allow_cash: boolean
  allow_card: boolean
  require_deposit: boolean
  bank_name: string
  bank_iban: string
  bank_account_holder: string
  bog_client_id: string
  bog_client_secret: string
  bog_use_production: boolean
}

export interface RulesAnswers {
  min_hours_before_booking: number | null
  max_days_advance_booking: number | null
  cancellation_hours_before: number | null
  refund_policy: RefundPolicy
  auto_confirm: boolean
}

export interface RemindersAnswers {
  reminder_hours_before: number | null
  second_reminder_hours_before: number | null
  sms_enabled: boolean
  sms_api_key: string
  sms_on_created: boolean
  sms_on_confirmed: boolean
  sms_on_rescheduled: boolean
  sms_on_cancelled: boolean
  sms_on_reminder: boolean
}

export interface PublicPageAnswers {
  enabled: boolean
  description: I18nText
  address: string
  phone: string
}

export interface BookingAnswers {
  timezone: string
  hours: HoursValue
  services: ServiceRow[]
  staff_user_ids: number[]
  payment: PaymentAnswers
  rules: RulesAnswers
  reminders: RemindersAnswers
  public_page: PublicPageAnswers
  /** Draft-only: sections the user edited (or that were applied before). */
  _touched: BookingSection[]
  [key: string]: unknown
}

export const REFUND_POLICIES: RefundPolicy[] = ["full", "partial_50", "partial_25", "no_refund"]
const SMS_EVENTS = ["sms_on_created", "sms_on_confirmed", "sms_on_rescheduled", "sms_on_cancelled", "sms_on_reminder"] as const

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
  return null
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback
}

function i18n(v: unknown): I18nText {
  if (typeof v === "string") return { ka: v, en: v }
  if (v && typeof v === "object") {
    const r = v as Record<string, unknown>
    return { ka: str(r.ka), en: str(r.en) }
  }
  return { ...EMPTY_I18N }
}

function i18nOrNull(v: unknown): I18nText | null {
  if (v === null || v === undefined) return null
  const out = i18n(v)
  return out.ka || out.en ? out : null
}

/** "25" / 25 / "25.5" → "25.00" / "25.50"; empty stays "". */
export function formatPrice(v: unknown): string {
  const n = num(v)
  if (n === null) return typeof v === "string" ? v.trim() : ""
  return n.toFixed(2)
}

export function emptyService(): ServiceRow {
  return { name: { ...EMPTY_I18N }, duration_minutes: 60, price: "", deposit_percentage: 0, category: null }
}

export function normalizeService(raw: unknown): ServiceRow | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const name = i18n(r.name)
  if (!name.ka && !name.en) return null
  return {
    name,
    duration_minutes: num(r.duration_minutes) ?? 60,
    price: formatPrice(r.price),
    deposit_percentage: num(r.deposit_percentage) ?? 0,
    category: i18nOrNull(r.category),
  }
}

export function servicesFrom(raw: unknown): ServiceRow[] {
  return Array.isArray(raw) ? raw.map(normalizeService).filter((s): s is ServiceRow => s !== null) : []
}

/** `context.service_presets[industry]` (falls back to `other`), normalised. */
export function servicePresets(context: Record<string, unknown>, industry: string | null): ServiceRow[] {
  const presets = context.service_presets && typeof context.service_presets === "object" ? (context.service_presets as Record<string, unknown>) : null
  if (!presets) return []
  const list = servicesFrom(presets[industry ?? "other"])
  return list.length > 0 ? list : industry && industry !== "other" ? servicesFrom(presets.other) : []
}

export const DEFAULT_PAYMENT: PaymentAnswers = {
  method: "manual_transfer",
  allow_cash: true,
  allow_card: true,
  require_deposit: false,
  bank_name: "",
  bank_iban: "",
  bank_account_holder: "",
  bog_client_id: "",
  bog_client_secret: "",
  bog_use_production: false,
}

export const DEFAULT_RULES: RulesAnswers = {
  min_hours_before_booking: 2,
  max_days_advance_booking: 30,
  cancellation_hours_before: 24,
  refund_policy: "full",
  auto_confirm: true,
}

export const DEFAULT_REMINDERS: RemindersAnswers = {
  reminder_hours_before: 24,
  second_reminder_hours_before: null,
  sms_enabled: false,
  sms_api_key: "",
  sms_on_created: true,
  sms_on_confirmed: true,
  sms_on_rescheduled: true,
  sms_on_cancelled: true,
  sms_on_reminder: true,
}

export const DEFAULT_PUBLIC_PAGE: PublicPageAnswers = { enabled: true, description: { ...EMPTY_I18N }, address: "", phone: "" }

function paymentFrom(raw: unknown): PaymentAnswers {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const method = str(r.method)
  return {
    method: method === "bog_gateway" ? "bog_gateway" : "manual_transfer",
    allow_cash: bool(r.allow_cash, DEFAULT_PAYMENT.allow_cash),
    allow_card: bool(r.allow_card, DEFAULT_PAYMENT.allow_card),
    require_deposit: bool(r.require_deposit, DEFAULT_PAYMENT.require_deposit),
    bank_name: str(r.bank_name),
    bank_iban: str(r.bank_iban),
    bank_account_holder: str(r.bank_account_holder),
    bog_client_id: str(r.bog_client_id),
    bog_client_secret: str(r.bog_client_secret),
    bog_use_production: bool(r.bog_use_production, false),
  }
}

function rulesFrom(raw: unknown): RulesAnswers {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const policy = str(r.refund_policy)
  return {
    min_hours_before_booking: num(r.min_hours_before_booking) ?? DEFAULT_RULES.min_hours_before_booking,
    max_days_advance_booking: num(r.max_days_advance_booking) ?? DEFAULT_RULES.max_days_advance_booking,
    cancellation_hours_before: num(r.cancellation_hours_before) ?? DEFAULT_RULES.cancellation_hours_before,
    refund_policy: (REFUND_POLICIES as string[]).includes(policy) ? (policy as RefundPolicy) : DEFAULT_RULES.refund_policy,
    auto_confirm: bool(r.auto_confirm, DEFAULT_RULES.auto_confirm),
  }
}

function remindersFrom(raw: unknown): RemindersAnswers {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const out: RemindersAnswers = {
    reminder_hours_before: num(r.reminder_hours_before) ?? DEFAULT_REMINDERS.reminder_hours_before,
    second_reminder_hours_before: num(r.second_reminder_hours_before),
    sms_enabled: bool(r.sms_enabled, false),
    sms_api_key: str(r.sms_api_key),
    sms_on_created: true,
    sms_on_confirmed: true,
    sms_on_rescheduled: true,
    sms_on_cancelled: true,
    sms_on_reminder: true,
  }
  for (const key of SMS_EVENTS) out[key] = bool(r[key], DEFAULT_REMINDERS[key])
  return out
}

function publicPageFrom(raw: unknown): PublicPageAnswers {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    enabled: bool(r.enabled, DEFAULT_PUBLIC_PAGE.enabled),
    description: i18n(r.description),
    address: str(r.address),
    phone: str(r.phone),
  }
}

const SECTIONS: BookingSection[] = ["payment", "rules", "reminders", "public_page"]

/** Draft: last answers (their sections count as touched), else prefill (untouched sections). */
export function initBookingAnswers(step: Pick<OnboardingStep, "answers" | "prefill">): BookingAnswers {
  const applied = Object.keys(step.answers ?? {}).length > 0
  const src = (applied ? step.answers : step.prefill) ?? {}
  return {
    timezone: str(src.timezone) || DEFAULT_TIMEZONE,
    hours: normalizeHours(src.hours),
    services: servicesFrom(src.services),
    staff_user_ids: Array.isArray(src.staff_user_ids) ? src.staff_user_ids.filter((id): id is number => Number.isInteger(id)) : [],
    payment: paymentFrom(src.payment),
    rules: rulesFrom(src.rules),
    reminders: remindersFrom(src.reminders),
    public_page: publicPageFrom(src.public_page),
    _touched: applied ? SECTIONS.filter((s) => src[s] && typeof src[s] === "object") : [],
  }
}

function trimI18n(v: I18nText): I18nText {
  return { ka: v.ka.trim(), en: v.en.trim() }
}

function clamp(v: number | null, min: number, max: number, fallback: number | null): number {
  const n = v ?? fallback ?? min
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Contract payload: core keys always, the other sections only when touched. */
export function prepareBookingAnswers(a: BookingAnswers): Record<string, unknown> {
  const services = a.services
    .map((s) => ({
      name: trimI18n(s.name),
      duration_minutes: clamp(s.duration_minutes, 5, 1440, 60),
      price: formatPrice(s.price) || "0.00",
      deposit_percentage: clamp(s.deposit_percentage, 0, 100, 0),
      category: s.category && (s.category.ka.trim() || s.category.en.trim()) ? trimI18n(s.category) : null,
    }))
    .filter((s) => s.name.ka || s.name.en)
  const payload: Record<string, unknown> = {
    timezone: a.timezone || DEFAULT_TIMEZONE,
    hours: a.hours,
    services,
    staff_user_ids: [...new Set(a.staff_user_ids)],
  }
  const touched = new Set(a._touched)
  if (touched.has("payment")) {
    const p = a.payment
    payload.payment = {
      method: p.method,
      allow_cash: !!p.allow_cash,
      allow_card: !!p.allow_card,
      require_deposit: !!p.require_deposit,
      bank_name: p.bank_name.trim(),
      bank_iban: p.bank_iban.replace(/\s+/g, "").toUpperCase(),
      bank_account_holder: p.bank_account_holder.trim(),
      bog_client_id: p.bog_client_id.trim() || null,
      bog_client_secret: p.bog_client_secret.trim() || null,
      bog_use_production: !!p.bog_use_production,
    }
  }
  if (touched.has("rules")) {
    const r = a.rules
    payload.rules = {
      min_hours_before_booking: clamp(r.min_hours_before_booking, 0, 720, DEFAULT_RULES.min_hours_before_booking),
      max_days_advance_booking: clamp(r.max_days_advance_booking, 1, 365, DEFAULT_RULES.max_days_advance_booking),
      cancellation_hours_before: clamp(r.cancellation_hours_before, 0, 720, DEFAULT_RULES.cancellation_hours_before),
      refund_policy: r.refund_policy,
      auto_confirm: !!r.auto_confirm,
    }
  }
  if (touched.has("reminders")) {
    const r = a.reminders
    payload.reminders = {
      reminder_hours_before: clamp(r.reminder_hours_before, 1, 720, DEFAULT_REMINDERS.reminder_hours_before),
      second_reminder_hours_before: r.second_reminder_hours_before === null ? null : clamp(r.second_reminder_hours_before, 1, 720, 2),
      sms_enabled: !!r.sms_enabled,
      sms_api_key: r.sms_enabled && r.sms_api_key.trim() ? r.sms_api_key.trim() : null,
      sms_on_created: !!r.sms_on_created,
      sms_on_confirmed: !!r.sms_on_confirmed,
      sms_on_rescheduled: !!r.sms_on_rescheduled,
      sms_on_cancelled: !!r.sms_on_cancelled,
      sms_on_reminder: !!r.sms_on_reminder,
    }
  }
  if (touched.has("public_page")) {
    const p = a.public_page
    payload.public_page = { enabled: !!p.enabled, description: trimI18n(p.description), address: p.address.trim(), phone: p.phone.trim() }
  }
  return payload
}

function I18nCell({
  value,
  onChange,
  ariaLabel,
  testId,
}: {
  value: I18nText
  onChange: (v: I18nText) => void
  ariaLabel: string
  testId: string
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row">
      {(["ka", "en"] as const).map((lang) => (
        <input
          key={lang}
          type="text"
          value={value[lang]}
          placeholder={lang.toUpperCase()}
          aria-label={`${ariaLabel} ${lang.toUpperCase()}`}
          onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
          className={cn(inputClass, "h-8 text-xs")}
          data-testid={`${testId}-${lang}`}
        />
      ))}
    </div>
  )
}

export function BookingManagementStep({ answers, setAnswers, errors, context }: StepComponentProps<BookingAnswers>) {
  const t = useTranslations("onboarding.bookings")
  const industry = useOnboardingIndustry()
  const { userId } = useMyAccess()
  const patch = (p: Partial<BookingAnswers>) => setAnswers((prev) => ({ ...prev, ...p }))
  const patchSection = <S extends BookingSection>(section: S, p: Partial<BookingAnswers[S]>) =>
    setAnswers((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...p },
      _touched: prev._touched.includes(section) ? prev._touched : [...prev._touched, section],
    }))

  const presets = servicePresets(context, industry)

  // First render: suggested services of the industry when the table is empty, and "me" among the staff.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const p: Partial<BookingAnswers> = {}
    if (answers.services.length === 0 && presets.length > 0) p.services = presets
    if (answers.staff_user_ids.length === 0 && typeof userId === "number") p.staff_user_ids = [userId]
    if (Object.keys(p).length > 0) patch(p)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [bogOpen, setBogOpen] = useState(false)
  const publicUrl = str(context.public_url)
  const { payment, rules, reminders, public_page: pub } = answers

  return (
    <div className="flex flex-col gap-4" data-testid="onb-step-bookings">
      <SectionCard title={t("hours.title")} hint={t("hours.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <TimezoneField value={answers.timezone} onChange={(timezone) => patch({ timezone })} error={firstError(errors, "timezone")} testId="onb-bookings-timezone" />
        <HoursGrid value={answers.hours} onChange={(hours) => patch({ hours })} error={firstError(errors, "hours")} testId="onb-bookings-hours" />
      </SectionCard>

      <SectionCard
        title={t("services.title")}
        hint={t("services.hint")}
        actions={
          presets.length > 0 && (
            <button type="button" onClick={() => patch({ services: presets })} className={rdButton.outlineSm} data-testid="onb-bookings-load-presets">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("services.loadPresets")}
            </button>
          )
        }
        bodyClassName="p-4"
      >
        <EditableTable<ServiceRow>
          columns={[
            {
              key: "name",
              label: t("services.colName"),
              type: "custom",
              width: "minmax(0,2fr)",
              render: (row, update, index) => (
                <I18nCell value={row.name} onChange={(name) => update({ name })} ariaLabel={t("services.colName")} testId={`onb-bookings-services-row-${index}-name`} />
              ),
            },
            { key: "duration_minutes", label: t("services.colDuration"), type: "number", width: "92px" },
            { key: "price", label: t("services.colPrice"), placeholder: "25.00", width: "96px" },
            { key: "deposit_percentage", label: t("services.colDeposit"), type: "number", width: "84px" },
            {
              key: "category",
              label: t("services.colCategory"),
              type: "custom",
              width: "minmax(0,1.4fr)",
              render: (row, update, index) => (
                <I18nCell
                  value={row.category ?? EMPTY_I18N}
                  onChange={(category) => update({ category })}
                  ariaLabel={t("services.colCategory")}
                  testId={`onb-bookings-services-row-${index}-category`}
                />
              ),
            },
          ]}
          rows={answers.services}
          onChange={(services) => patch({ services })}
          newRow={emptyService}
          rowErrors={rowErrorsOf(errors, "services")}
          error={typeof errors?.services === "string" ? errors.services : null}
          addLabel={t("services.add")}
          emptyText={t("services.empty")}
          testId="onb-bookings-services"
        />
      </SectionCard>

      <SectionCard title={t("staff.title")} hint={t("staff.hint")} bodyClassName="p-4">
        <UsersPicker
          users={context.users}
          value={answers.staff_user_ids}
          onChange={(staff_user_ids) => patch({ staff_user_ids })}
          error={firstError(errors, "staff_user_ids")}
          testId="onb-bookings-staff"
        />
      </SectionCard>

      <SectionCard title={t("payment.title")} hint={t("payment.hint")} bodyClassName="flex flex-col gap-4 p-4" testId="onb-bookings-payment">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("payment.method")}</span>
          <Segmented<PaymentMethod>
            size="md"
            value={payment.method}
            onChange={(method) => patchSection("payment", { method })}
            options={[
              { value: "manual_transfer", label: t("payment.manual"), icon: Banknote },
              { value: "bog_gateway", label: t("payment.bog"), icon: CreditCard },
            ]}
            ariaLabel={t("payment.method")}
            testId="onb-bookings-payment-method"
          />
          {nestedError(errors, "payment.method") && (
            <span role="alert" className="text-xs text-destructive">
              {nestedError(errors, "payment.method")}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Toggle label={t("payment.cash")} checked={payment.allow_cash} onChange={(allow_cash) => patchSection("payment", { allow_cash })} error={nestedError(errors, "payment.allow_cash")} testId="onb-bookings-cash" />
          <Toggle label={t("payment.card")} checked={payment.allow_card} onChange={(allow_card) => patchSection("payment", { allow_card })} error={nestedError(errors, "payment.allow_card")} testId="onb-bookings-card" />
          <Toggle label={t("payment.deposit")} help={t("payment.depositHint")} checked={payment.require_deposit} onChange={(require_deposit) => patchSection("payment", { require_deposit })} error={nestedError(errors, "payment.require_deposit")} testId="onb-bookings-deposit" />
        </div>
        {payment.method === "manual_transfer" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="onb-bookings-bank">
            <TextField label={t("payment.bankName")} value={payment.bank_name} onChange={(bank_name) => patchSection("payment", { bank_name })} error={nestedError(errors, "payment.bank_name")} testId="onb-bookings-bank-name" />
            <TextField label={t("payment.iban")} value={payment.bank_iban} onChange={(bank_iban) => patchSection("payment", { bank_iban })} placeholder="GE00TB0000000000000000" error={nestedError(errors, "payment.bank_iban")} testId="onb-bookings-bank-iban" />
            <TextField label={t("payment.holder")} value={payment.bank_account_holder} onChange={(bank_account_holder) => patchSection("payment", { bank_account_holder })} error={nestedError(errors, "payment.bank_account_holder")} testId="onb-bookings-bank-holder" />
          </div>
        )}
        {payment.method === "bog_gateway" && (
          <div className="rounded-lg border" data-testid="onb-bookings-bog">
            <button
              type="button"
              onClick={() => setBogOpen((v) => !v)}
              aria-expanded={bogOpen}
              className="flex h-9 w-full items-center justify-between gap-2 px-3 text-[13px] font-medium hover:bg-accent/60"
              data-testid="onb-bookings-bog-toggle"
            >
              {t("payment.bogCredentials")}
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", bogOpen && "rotate-180")} aria-hidden />
            </button>
            {bogOpen && (
              <div className="flex flex-col gap-4 border-t p-3">
                <TextField label={t("payment.bogClientId")} value={payment.bog_client_id} onChange={(bog_client_id) => patchSection("payment", { bog_client_id })} error={nestedError(errors, "payment.bog_client_id")} inputClassName="sm:max-w-[360px]" testId="onb-bookings-bog-id" />
                <SecretField label={t("payment.bogClientSecret")} value={payment.bog_client_secret} onChange={(bog_client_secret) => patchSection("payment", { bog_client_secret })} error={nestedError(errors, "payment.bog_client_secret")} testId="onb-bookings-bog-secret" />
                <Toggle label={t("payment.bogProduction")} help={t("payment.bogProductionHint")} checked={payment.bog_use_production} onChange={(bog_use_production) => patchSection("payment", { bog_use_production })} testId="onb-bookings-bog-prod" />
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("rules.title")} hint={t("rules.hint")} bodyClassName="flex flex-col gap-4 p-4" testId="onb-bookings-rules">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberField label={t("rules.minHours")} value={rules.min_hours_before_booking} onChange={(v) => patchSection("rules", { min_hours_before_booking: v })} min={0} max={720} suffix={t("units.hours")} error={nestedError(errors, "rules.min_hours_before_booking")} testId="onb-bookings-min-hours" />
          <NumberField label={t("rules.maxDays")} value={rules.max_days_advance_booking} onChange={(v) => patchSection("rules", { max_days_advance_booking: v })} min={1} max={365} suffix={t("units.days")} error={nestedError(errors, "rules.max_days_advance_booking")} testId="onb-bookings-max-days" />
          <NumberField label={t("rules.cancelHours")} value={rules.cancellation_hours_before} onChange={(v) => patchSection("rules", { cancellation_hours_before: v })} min={0} max={720} suffix={t("units.hours")} error={nestedError(errors, "rules.cancellation_hours_before")} testId="onb-bookings-cancel-hours" />
        </div>
        <SelectField
          label={t("rules.refund")}
          value={rules.refund_policy}
          onChange={(refund_policy) => patchSection("rules", { refund_policy })}
          options={REFUND_POLICIES.map((p) => ({ value: p, label: t(`rules.refunds.${p}`) }))}
          error={nestedError(errors, "rules.refund_policy")}
          selectClassName="sm:max-w-[300px]"
          testId="onb-bookings-refund"
        />
        <Toggle label={t("rules.autoConfirm")} help={t("rules.autoConfirmHint")} checked={rules.auto_confirm} onChange={(auto_confirm) => patchSection("rules", { auto_confirm })} error={nestedError(errors, "rules.auto_confirm")} testId="onb-bookings-auto-confirm" />
      </SectionCard>

      <SectionCard title={t("reminders.title")} hint={t("reminders.hint")} bodyClassName="flex flex-col gap-4 p-4" testId="onb-bookings-reminders">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField label={t("reminders.first")} value={reminders.reminder_hours_before} onChange={(v) => patchSection("reminders", { reminder_hours_before: v })} min={1} max={720} suffix={t("units.hours")} error={nestedError(errors, "reminders.reminder_hours_before")} testId="onb-bookings-reminder-1" />
          <NumberField label={t("reminders.second")} help={t("reminders.secondHint")} value={reminders.second_reminder_hours_before} onChange={(v) => patchSection("reminders", { second_reminder_hours_before: v })} min={1} max={720} suffix={t("units.hours")} error={nestedError(errors, "reminders.second_reminder_hours_before")} testId="onb-bookings-reminder-2" />
        </div>
        <Toggle label={t("reminders.sms")} help={t("reminders.smsHint")} checked={reminders.sms_enabled} onChange={(sms_enabled) => patchSection("reminders", { sms_enabled })} error={nestedError(errors, "reminders.sms_enabled")} testId="onb-bookings-sms" />
        {reminders.sms_enabled && (
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-3" data-testid="onb-bookings-sms-options">
            <SecretField label={t("reminders.smsKey")} help={t("reminders.smsKeyHint")} value={reminders.sms_api_key} onChange={(sms_api_key) => patchSection("reminders", { sms_api_key })} error={nestedError(errors, "reminders.sms_api_key")} testId="onb-bookings-sms-key" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SMS_EVENTS.map((key) => (
                <Toggle key={key} label={t(`reminders.events.${key}`)} checked={reminders[key]} onChange={(v) => patchSection("reminders", { [key]: v } as Partial<RemindersAnswers>)} testId={`onb-bookings-${key}`} />
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("publicPage.title")} hint={t("publicPage.hint")} bodyClassName="flex flex-col gap-4 p-4" testId="onb-bookings-public">
        <Toggle label={t("publicPage.enabled")} help={t("publicPage.enabledHint")} checked={pub.enabled} onChange={(enabled) => patchSection("public_page", { enabled })} error={nestedError(errors, "public_page.enabled")} testId="onb-bookings-public-enabled" />
        {publicUrl && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-[13px]" data-testid="onb-bookings-public-url">
            <span className="text-muted-foreground">{t("publicPage.url")}</span>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline underline-offset-2 break-all">
              {publicUrl.replace(/^https?:\/\//, "")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        )}
        <I18nTextField label={t("publicPage.description")} value={pub.description} onChange={(description) => patchSection("public_page", { description })} multiline error={nestedError(errors, "public_page.description")} testId="onb-bookings-public-description" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label={t("publicPage.address")} value={pub.address} onChange={(address) => patchSection("public_page", { address })} error={nestedError(errors, "public_page.address")} testId="onb-bookings-public-address" />
          <TextField label={t("publicPage.phone")} type="tel" value={pub.phone} onChange={(phone) => patchSection("public_page", { phone })} placeholder="+995 ..." error={nestedError(errors, "public_page.phone")} testId="onb-bookings-public-phone" />
        </div>
      </SectionCard>
    </div>
  )
}

export const step: StepDefinition<BookingAnswers> = {
  key: "booking_management",
  titleKey: "steps.booking_management.title",
  Component: BookingManagementStep,
  init: initBookingAnswers,
  prepare: prepareBookingAnswers,
}
