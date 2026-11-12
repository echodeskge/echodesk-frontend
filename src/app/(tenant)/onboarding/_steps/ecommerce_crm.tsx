"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Check, ChevronDown, ChevronRight, ExternalLink, LayoutTemplate, Sparkles, X } from "lucide-react"
import { MiniMapPicker } from "@/components/MiniMapPicker"
import { rdButton } from "@/components/redesign/buttons"
import { TonePill } from "@/components/redesign/pill"
import { SectionCard } from "@/components/redesign/section-card"
import { Segmented } from "@/components/redesign/segmented"
import { SecretInput } from "@/components/redesign/settings/controls"
import type { Tone } from "@/components/redesign/tones"
import { cn } from "@/lib/utils"
import type { OnboardingStep } from "../_lib/onboarding-api"
import { errorAt, listErrorAt, rowErrorsAt } from "../_lib/nested-errors"
import { EMPTY_I18N, EditableTable, I18nTextField, MultiChoiceCards, NumberField, TextField, Toggle, inputClass, type I18nText } from "../_components/fields"
import type { StepComponentProps, StepDefinition } from "./types"

/**
 * SCHEMAS.md `ecommerce_crm`:
 * {"store": {name, email, phone}, "categories": [I18n],
 *  "payment": {cash_on_delivery, card, provider: "bog"|"tbc"|"flitt"|null, bog_*, tbc_*, flitt_*},
 *  "delivery": {allow_pickup, pickup_address, methods: [{name: I18n, price, free_shipping_threshold, estimated_days}],
 *               quickshipper: {enabled, api_key, use_production, pickup: {contact_name, phone, address, city, latitude, longitude, extra_instructions}} | null},
 *  "tax": {rate: "18.00", inclusive, label}, "look": {template, preset, color_mode, primary_color},
 *  "analytics": {google_analytics_id, google_ads_conversion_id, google_ads_purchase_label, clarity_project_id},
 *  "deploy_now": bool}
 * context = {deployment: {status, url}, languages, existing: {products, shipping_methods}, presets: {industry: categories}}
 */
export type PaymentProvider = "bog" | "tbc" | "flitt"
export type StorefrontTemplate = "classic" | "voltage"
export type ColorMode = "light" | "dark"
export type VoltagePreset = "refurb" | "cobalt" | "ember" | "forest" | "violet" | "mono" | "rose"

export interface ShopStore {
  name: string
  email: string
  phone: string
}

export interface ShopPayment {
  cash_on_delivery: boolean
  card: boolean
  provider: PaymentProvider | null
  bog_client_id: string
  bog_client_secret: string
  tbc_client_id: string
  tbc_client_secret: string
  tbc_api_key: string
  flitt_merchant_id: string
  flitt_password: string
}

export interface DeliveryMethodRow {
  name_ka: string
  name_en: string
  price: string
  free_shipping_threshold: string
  estimated_days: number | null
}

export interface QuickshipperPickup {
  contact_name: string
  phone: string
  address: string
  city: string
  latitude: number | null
  longitude: number | null
  extra_instructions: string
}

export interface ShopQuickshipper {
  enabled: boolean
  api_key: string
  use_production: boolean
  pickup: QuickshipperPickup
}

export interface ShopDelivery {
  allow_pickup: boolean
  pickup_address: string
  methods: DeliveryMethodRow[]
  quickshipper: ShopQuickshipper
}

export interface ShopTax {
  rate: string
  inclusive: boolean
  label: string
}

export interface ShopLook {
  template: StorefrontTemplate
  preset: VoltagePreset
  color_mode: ColorMode
  primary_color: string
}

export interface ShopAnalytics {
  google_analytics_id: string
  google_ads_conversion_id: string
  google_ads_purchase_label: string
  clarity_project_id: string
}

export interface ShopAnswers {
  store: ShopStore
  categories: I18nText[]
  payment: ShopPayment
  delivery: ShopDelivery
  tax: ShopTax
  look: ShopLook
  analytics: ShopAnalytics
  deploy_now: boolean
  [key: string]: unknown
}

export const PROVIDERS: PaymentProvider[] = ["bog", "tbc", "flitt"]
export const VOLTAGE_PRESETS: Record<VoltagePreset, { accent: string; accent2: string }> = {
  refurb: { accent: "#f0d860", accent2: "#3955d6" },
  cobalt: { accent: "#3955d6", accent2: "#f0d860" },
  ember: { accent: "#dd6b3a", accent2: "#1a1a2e" },
  forest: { accent: "#3a8c5a", accent2: "#e8d35a" },
  violet: { accent: "#8e4dd6", accent2: "#e6cc60" },
  mono: { accent: "#1a1a2e", accent2: "#f5f5f0" },
  rose: { accent: "#e35884", accent2: "#1a1a2e" },
}
const PRESET_KEYS = Object.keys(VOLTAGE_PRESETS) as VoltagePreset[]

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback)
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback)
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
  return null
}
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const money = (v: unknown, fallback: string): string => {
  const n = num(v)
  return n === null ? fallback : n.toFixed(2)
}

export function i18nOf(v: unknown): I18nText {
  if (typeof v === "string") return { ka: v, en: v }
  const r = rec(v)
  return { ka: str(r.ka), en: str(r.en) }
}

export function emptyMethodRow(): DeliveryMethodRow {
  return { name_ka: "", name_en: "", price: "", free_shipping_threshold: "", estimated_days: null }
}

/** Draft: last answers else prefill, with defaults for every section. */
export function initShopAnswers(step: Pick<OnboardingStep, "answers" | "prefill" | "context">): ShopAnswers {
  const src = (Object.keys(step.answers ?? {}).length ? step.answers : step.prefill) ?? {}
  const store = rec(src.store)
  const payment = rec(src.payment)
  const delivery = rec(src.delivery)
  const qs = rec(delivery.quickshipper)
  const pickup = rec(qs.pickup)
  const tax = rec(src.tax)
  const look = rec(src.look)
  const analytics = rec(src.analytics)
  const provider = str(payment.provider)
  const template = str(look.template)
  const preset = str(look.preset)
  const mode = str(look.color_mode)

  return {
    store: { name: str(store.name), email: str(store.email), phone: str(store.phone) },
    categories: Array.isArray(src.categories) ? src.categories.map(i18nOf).filter((c) => c.ka || c.en) : [],
    payment: {
      cash_on_delivery: bool(payment.cash_on_delivery, true),
      card: bool(payment.card, false),
      provider: (PROVIDERS as string[]).includes(provider) ? (provider as PaymentProvider) : null,
      bog_client_id: str(payment.bog_client_id),
      bog_client_secret: str(payment.bog_client_secret),
      tbc_client_id: str(payment.tbc_client_id),
      tbc_client_secret: str(payment.tbc_client_secret),
      tbc_api_key: str(payment.tbc_api_key),
      flitt_merchant_id: str(payment.flitt_merchant_id),
      flitt_password: str(payment.flitt_password),
    },
    delivery: {
      allow_pickup: bool(delivery.allow_pickup, false),
      pickup_address: str(delivery.pickup_address),
      methods: Array.isArray(delivery.methods)
        ? delivery.methods.map((m): DeliveryMethodRow => {
            const r = rec(m)
            const name = i18nOf(r.name)
            const threshold = num(r.free_shipping_threshold)
            return {
              name_ka: name.ka,
              name_en: name.en,
              price: money(r.price, ""),
              free_shipping_threshold: threshold === null ? "" : threshold.toFixed(2),
              estimated_days: num(r.estimated_days),
            }
          })
        : [],
      quickshipper: {
        enabled: bool(qs.enabled, false),
        api_key: str(qs.api_key),
        use_production: bool(qs.use_production, false),
        pickup: {
          contact_name: str(pickup.contact_name),
          phone: str(pickup.phone),
          address: str(pickup.address),
          city: str(pickup.city, "Tbilisi"),
          latitude: num(pickup.latitude),
          longitude: num(pickup.longitude),
          extra_instructions: str(pickup.extra_instructions),
        },
      },
    },
    tax: { rate: money(tax.rate, "18.00"), inclusive: bool(tax.inclusive, true), label: str(tax.label, "VAT") },
    look: {
      template: template === "voltage" ? "voltage" : "classic",
      preset: (PRESET_KEYS as string[]).includes(preset) ? (preset as VoltagePreset) : "refurb",
      color_mode: mode === "dark" ? "dark" : "light",
      primary_color: str(look.primary_color),
    },
    analytics: {
      google_analytics_id: str(analytics.google_analytics_id),
      google_ads_conversion_id: str(analytics.google_ads_conversion_id),
      google_ads_purchase_label: str(analytics.google_ads_purchase_label),
      clarity_project_id: str(analytics.clarity_project_id),
    },
    deploy_now: bool(src.deploy_now, false),
  }
}

const trim = (s: string) => s.trim()
const allEmpty = (o: Record<string, unknown>) => Object.values(o).every((v) => v === "" || v === null)

/** Payload: trimmed, I18n categories / method names, provider credentials only for the chosen provider, empty sections omitted. */
export function prepareShopAnswers(a: ShopAnswers): ShopAnswers {
  const out: Record<string, unknown> = {}

  const store = { name: trim(a.store.name), email: trim(a.store.email), phone: trim(a.store.phone) }
  if (!allEmpty(store)) out.store = store

  const categories = a.categories.map((c) => ({ ka: trim(c.ka), en: trim(c.en) })).filter((c) => c.ka || c.en)
  if (categories.length) out.categories = categories

  const p = a.payment
  const provider = p.card ? p.provider : null
  const payment: Record<string, unknown> = { cash_on_delivery: p.cash_on_delivery, card: p.card, provider }
  if (provider === "bog") Object.assign(payment, { bog_client_id: trim(p.bog_client_id), bog_client_secret: trim(p.bog_client_secret) })
  if (provider === "tbc") Object.assign(payment, { tbc_client_id: trim(p.tbc_client_id), tbc_client_secret: trim(p.tbc_client_secret), tbc_api_key: trim(p.tbc_api_key) })
  if (provider === "flitt") Object.assign(payment, { flitt_merchant_id: trim(p.flitt_merchant_id), flitt_password: trim(p.flitt_password) })
  out.payment = payment

  const d = a.delivery
  const methods = d.methods
    .map((m) => ({
      name: { ka: trim(m.name_ka), en: trim(m.name_en) },
      price: money(m.price, "0.00"),
      // Number cells of EditableTable emit numbers, so the threshold may not be a string any more.
      free_shipping_threshold: String(m.free_shipping_threshold ?? "").trim() === "" ? null : money(m.free_shipping_threshold, "0.00"),
      estimated_days: m.estimated_days ?? 1,
    }))
    .filter((m) => m.name.ka || m.name.en)
  const q = d.quickshipper
  const pk = q.pickup
  out.delivery = {
    allow_pickup: d.allow_pickup,
    pickup_address: d.allow_pickup ? trim(d.pickup_address) : "",
    methods,
    quickshipper: q.enabled
      ? {
          enabled: true,
          api_key: trim(q.api_key) || null,
          use_production: q.use_production,
          pickup: {
            contact_name: trim(pk.contact_name),
            phone: trim(pk.phone),
            address: trim(pk.address),
            city: trim(pk.city),
            latitude: pk.latitude,
            longitude: pk.longitude,
            extra_instructions: trim(pk.extra_instructions),
          },
        }
      : null,
  }

  out.tax = { rate: money(a.tax.rate, "0.00"), inclusive: a.tax.inclusive, label: trim(a.tax.label) || "VAT" }

  const color = trim(a.look.primary_color)
  out.look = {
    template: a.look.template,
    preset: a.look.preset,
    color_mode: a.look.color_mode,
    primary_color: /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : null,
  }

  const analytics = {
    google_analytics_id: trim(a.analytics.google_analytics_id),
    google_ads_conversion_id: trim(a.analytics.google_ads_conversion_id),
    google_ads_purchase_label: trim(a.analytics.google_ads_purchase_label),
    clarity_project_id: trim(a.analytics.clarity_project_id),
  }
  if (!allEmpty(analytics)) out.analytics = analytics

  out.deploy_now = a.deploy_now
  return out as ShopAnswers
}

function presetsFor(context: Record<string, unknown>): I18nText[] {
  const presets = rec(context.presets)
  const industry = str(context.industry)
  const pick = (industry && presets[industry]) || presets.other || presets.shop || Object.values(presets)[0]
  return Array.isArray(pick) ? pick.map(i18nOf).filter((c) => c.ka || c.en) : []
}

function CategoryChips({
  value,
  onChange,
  suggestions,
  error,
}: {
  value: I18nText[]
  onChange: (next: I18nText[]) => void
  suggestions: I18nText[]
  error: string | null
}) {
  const t = useTranslations("onboarding.shop.categories")
  const locale = useLocale()
  const [draft, setDraft] = useState<I18nText>(EMPTY_I18N)
  const label = (c: I18nText) => (locale === "ka" ? c.ka || c.en : c.en || c.ka)
  const has = (c: I18nText) => value.some((v) => label(v).toLowerCase() === label(c).toLowerCase())
  const add = (c: I18nText) => {
    const clean = { ka: c.ka.trim() || c.en.trim(), en: c.en.trim() || c.ka.trim() }
    if (!clean.ka && !clean.en) return
    if (has(clean)) return
    onChange([...value, clean])
  }
  const remaining = suggestions.filter((s) => !has(s))

  return (
    <div className="flex flex-col gap-3" data-testid="onb-shop-categories">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="onb-shop-categories-chips">
          {value.map((c, i) => (
            <span key={`${c.ka}|${c.en}`} className="inline-flex h-6 items-center gap-1 rounded-full border bg-muted/60 ps-2.5 pe-1 text-xs">
              {label(c)}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`${label(c)} ×`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <I18nTextField label={t("new")} value={draft} onChange={setDraft} placeholder={{ ka: t("placeholderKa"), en: t("placeholderEn") }} className="min-w-0 flex-1" testId="onb-shop-category-new" />
        <button
          type="button"
          onClick={() => {
            add(draft)
            setDraft(EMPTY_I18N)
          }}
          disabled={!draft.ka.trim() && !draft.en.trim()}
          className={cn(rdButton.outline, "sm:mb-0")}
          data-testid="onb-shop-category-add"
        >
          {t("add")}
        </button>
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{t("suggestions")}:</span>
          {remaining.map((s) => (
            <button
              key={`${s.ka}|${s.en}`}
              type="button"
              onClick={() => add(s)}
              className="inline-flex h-6 items-center rounded-full border border-dashed px-2.5 text-xs text-foreground hover:bg-accent"
              data-testid={`onb-shop-category-suggest-${s.en || s.ka}`}
            >
              + {label(s)}
            </button>
          ))}
        </div>
      )}
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}

const DEPLOY_TONE: Record<string, Tone> = { deployed: "success", deploying: "info", failed: "danger", pending: "neutral" }

export function ShopStep({ answers, setAnswers, errors, context }: StepComponentProps<ShopAnswers>) {
  const t = useTranslations("onboarding.shop")
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const patch = <K extends "store" | "payment" | "delivery" | "tax" | "look" | "analytics">(section: K, p: Partial<ShopAnswers[K]>) =>
    setAnswers((prev) => ({ ...prev, [section]: { ...prev[section], ...p } }))
  const patchQs = (p: Partial<ShopQuickshipper>) => patch("delivery", { quickshipper: { ...answers.delivery.quickshipper, ...p } })
  const patchPickup = (p: Partial<QuickshipperPickup>) => patchQs({ pickup: { ...answers.delivery.quickshipper.pickup, ...p } })

  const deployment = rec(context.deployment)
  const deployStatus = str(deployment.status, "pending")
  const deployUrl = str(deployment.url)
  const alreadyDeployed = deployStatus === "deployed" && !!deployUrl

  const secret = (id: string, value: string, onChange: (v: string) => void, label: string, path: string) => (
    <div className="flex flex-col gap-1.5" data-testid={`onb-shop-${id}`}>
      <label htmlFor={`onb-shop-${id}`} className="text-[13px] font-medium">
        {label}
      </label>
      <SecretInput id={`onb-shop-${id}`} value={value} onChange={onChange} showLabel={t("payment.show")} hideLabel={t("payment.hide")} testId={`onb-shop-${id}-input`} />
      {errorAt(errors, path) && (
        <span role="alert" className="text-xs text-destructive">
          {errorAt(errors, path)}
        </span>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-4" data-testid="onb-step-ecommerce_crm">
      <SectionCard title={t("store.title")} hint={t("store.hint")} bodyClassName="grid gap-4 p-4 sm:grid-cols-3">
        <TextField label={t("store.name")} value={answers.store.name} onChange={(v) => patch("store", { name: v })} error={errorAt(errors, "store.name")} testId="onb-shop-store-name" />
        <TextField label={t("store.email")} type="email" value={answers.store.email} onChange={(v) => patch("store", { email: v })} error={errorAt(errors, "store.email")} testId="onb-shop-store-email" />
        <TextField label={t("store.phone")} type="tel" value={answers.store.phone} onChange={(v) => patch("store", { phone: v })} error={errorAt(errors, "store.phone")} testId="onb-shop-store-phone" />
      </SectionCard>

      <SectionCard title={t("categories.title")} hint={t("categories.hint")} bodyClassName="p-4">
        <CategoryChips value={answers.categories} onChange={(categories) => setAnswers((prev) => ({ ...prev, categories }))} suggestions={presetsFor(context)} error={errorAt(errors, "categories")} />
      </SectionCard>

      <SectionCard title={t("payment.title")} hint={t("payment.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <Toggle label={t("payment.cash")} help={t("payment.cashHint")} checked={answers.payment.cash_on_delivery} onChange={(v) => patch("payment", { cash_on_delivery: v })} error={errorAt(errors, "payment.cash_on_delivery")} testId="onb-shop-cash" />
        <Toggle
          label={t("payment.card")}
          help={t("payment.cardHint")}
          checked={answers.payment.card}
          onChange={(v) => patch("payment", { card: v, provider: v ? (answers.payment.provider ?? "bog") : answers.payment.provider })}
          error={errorAt(errors, "payment.card")}
          testId="onb-shop-card"
        />
        {answers.payment.card && (
          <div className="flex flex-col gap-4 rounded-[10px] border bg-muted/20 p-3" data-testid="onb-shop-provider-block">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">{t("payment.provider")}</span>
              <Segmented
                size="md"
                ariaLabel={t("payment.provider")}
                value={answers.payment.provider ?? "bog"}
                onChange={(v) => patch("payment", { provider: v })}
                options={PROVIDERS.map((p) => ({ value: p, label: t(`payment.providers.${p}`) }))}
                testId="onb-shop-provider"
              />
              {errorAt(errors, "payment.provider") && (
                <span role="alert" className="text-xs text-destructive">
                  {errorAt(errors, "payment.provider")}
                </span>
              )}
            </div>
            {answers.payment.provider === "bog" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label={t("payment.clientId")} value={answers.payment.bog_client_id} onChange={(v) => patch("payment", { bog_client_id: v })} error={errorAt(errors, "payment.bog_client_id")} testId="onb-shop-bog-client-id" />
                {secret("bog-client-secret", answers.payment.bog_client_secret, (v) => patch("payment", { bog_client_secret: v }), t("payment.clientSecret"), "payment.bog_client_secret")}
              </div>
            )}
            {answers.payment.provider === "tbc" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label={t("payment.clientId")} value={answers.payment.tbc_client_id} onChange={(v) => patch("payment", { tbc_client_id: v })} error={errorAt(errors, "payment.tbc_client_id")} testId="onb-shop-tbc-client-id" />
                {secret("tbc-client-secret", answers.payment.tbc_client_secret, (v) => patch("payment", { tbc_client_secret: v }), t("payment.clientSecret"), "payment.tbc_client_secret")}
                {secret("tbc-api-key", answers.payment.tbc_api_key, (v) => patch("payment", { tbc_api_key: v }), t("payment.apiKey"), "payment.tbc_api_key")}
              </div>
            )}
            {answers.payment.provider === "flitt" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label={t("payment.merchantId")} value={answers.payment.flitt_merchant_id} onChange={(v) => patch("payment", { flitt_merchant_id: v })} error={errorAt(errors, "payment.flitt_merchant_id")} testId="onb-shop-flitt-merchant-id" />
                {secret("flitt-password", answers.payment.flitt_password, (v) => patch("payment", { flitt_password: v }), t("payment.password"), "payment.flitt_password")}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("delivery.title")} hint={t("delivery.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <Toggle label={t("delivery.pickup")} help={t("delivery.pickupHint")} checked={answers.delivery.allow_pickup} onChange={(v) => patch("delivery", { allow_pickup: v })} error={errorAt(errors, "delivery.allow_pickup")} testId="onb-shop-pickup" />
        {answers.delivery.allow_pickup && (
          <TextField label={t("delivery.pickupAddress")} value={answers.delivery.pickup_address} onChange={(v) => patch("delivery", { pickup_address: v })} error={errorAt(errors, "delivery.pickup_address")} inputClassName="sm:max-w-[420px]" testId="onb-shop-pickup-address" />
        )}
        <EditableTable<DeliveryMethodRow>
          label={t("delivery.methods")}
          help={t("delivery.methodsHint")}
          columns={[
            { key: "name_ka", label: t("delivery.nameKa"), placeholder: t("delivery.namePlaceholderKa"), width: "minmax(0,1.2fr)" },
            { key: "name_en", label: t("delivery.nameEn"), placeholder: t("delivery.namePlaceholderEn"), width: "minmax(0,1.2fr)" },
            { key: "price", label: t("delivery.price"), type: "number", placeholder: "5.00", width: "90px" },
            { key: "free_shipping_threshold", label: t("delivery.freeFrom"), type: "number", placeholder: "100", width: "100px" },
            { key: "estimated_days", label: t("delivery.days"), type: "number", placeholder: "1", width: "70px" },
          ]}
          rows={answers.delivery.methods}
          onChange={(methods) => patch("delivery", { methods })}
          newRow={emptyMethodRow}
          rowErrors={rowErrorsAt(errors, "delivery.methods")}
          error={listErrorAt(errors, "delivery.methods")}
          addLabel={t("delivery.addMethod")}
          emptyText={t("delivery.methodsEmpty")}
          testId="onb-shop-methods"
        />
        <Toggle label={t("delivery.quickshipper")} help={t("delivery.quickshipperHint")} checked={answers.delivery.quickshipper.enabled} onChange={(v) => patchQs({ enabled: v })} error={errorAt(errors, "delivery.quickshipper.enabled")} testId="onb-shop-quickshipper" />
        {answers.delivery.quickshipper.enabled && (
          <div className="flex flex-col gap-4 rounded-[10px] border bg-muted/20 p-3" data-testid="onb-shop-quickshipper-block">
            <div className="grid gap-4 sm:grid-cols-2">
              {secret("qs-api-key", answers.delivery.quickshipper.api_key, (v) => patchQs({ api_key: v }), t("delivery.qsApiKey"), "delivery.quickshipper.api_key")}
              <Toggle label={t("delivery.qsProduction")} help={t("delivery.qsProductionHint")} checked={answers.delivery.quickshipper.use_production} onChange={(v) => patchQs({ use_production: v })} testId="onb-shop-qs-production" />
            </div>
            <span className="text-[13px] font-medium">{t("delivery.pickupPoint")}</span>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={t("delivery.contactName")} value={answers.delivery.quickshipper.pickup.contact_name} onChange={(v) => patchPickup({ contact_name: v })} error={errorAt(errors, "delivery.quickshipper.pickup.contact_name")} testId="onb-shop-qs-contact" />
              <TextField label={t("delivery.phone")} type="tel" value={answers.delivery.quickshipper.pickup.phone} onChange={(v) => patchPickup({ phone: v })} error={errorAt(errors, "delivery.quickshipper.pickup.phone")} testId="onb-shop-qs-phone" />
              <TextField label={t("delivery.address")} value={answers.delivery.quickshipper.pickup.address} onChange={(v) => patchPickup({ address: v })} error={errorAt(errors, "delivery.quickshipper.pickup.address")} testId="onb-shop-qs-address" />
              <TextField label={t("delivery.city")} value={answers.delivery.quickshipper.pickup.city} onChange={(v) => patchPickup({ city: v })} error={errorAt(errors, "delivery.quickshipper.pickup.city")} testId="onb-shop-qs-city" />
              <TextField label={t("delivery.extra")} value={answers.delivery.quickshipper.pickup.extra_instructions} onChange={(v) => patchPickup({ extra_instructions: v })} className="sm:col-span-2" testId="onb-shop-qs-extra" />
            </div>
            <MiniMapPicker
              latitude={answers.delivery.quickshipper.pickup.latitude}
              longitude={answers.delivery.quickshipper.pickup.longitude}
              onChange={(lat, lng) => patchPickup({ latitude: lat, longitude: lng })}
              labels={{ dropPin: t("delivery.mapDropPin"), movePin: t("delivery.mapMovePin"), loading: t("delivery.mapLoading") }}
            />
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("tax.title")} hint={t("tax.hint")} bodyClassName="grid gap-4 p-4 sm:grid-cols-3">
        <NumberField label={t("tax.rate")} value={num(answers.tax.rate)} onChange={(v) => patch("tax", { rate: v === null ? "" : String(v) })} min={0} max={100} step={0.5} suffix="%" error={errorAt(errors, "tax.rate")} testId="onb-shop-tax-rate" />
        <TextField label={t("tax.label")} value={answers.tax.label} onChange={(v) => patch("tax", { label: v })} error={errorAt(errors, "tax.label")} testId="onb-shop-tax-label" />
        <Toggle label={t("tax.inclusive")} help={t("tax.inclusiveHint")} checked={answers.tax.inclusive} onChange={(v) => patch("tax", { inclusive: v })} error={errorAt(errors, "tax.inclusive")} testId="onb-shop-tax-inclusive" />
      </SectionCard>

      <SectionCard title={t("look.title")} hint={t("look.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <MultiChoiceCards
          options={[
            { value: "classic", label: t("look.classic"), description: t("look.classicHint"), icon: LayoutTemplate },
            { value: "voltage", label: t("look.voltage"), description: t("look.voltageHint"), icon: Sparkles },
          ]}
          value={answers.look.template}
          onChange={(v) => patch("look", { template: v })}
          columns={2}
          error={errorAt(errors, "look.template")}
          testId="onb-shop-template"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">{t("look.preset")}</span>
            <div role="radiogroup" aria-label={t("look.preset")} className="grid grid-cols-7 gap-2 sm:max-w-[260px]">
              {PRESET_KEYS.map((key) => {
                const sw = VOLTAGE_PRESETS[key]
                const checked = answers.look.preset === key
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    aria-label={t(`look.presets.${key}`)}
                    title={t(`look.presets.${key}`)}
                    onClick={() => patch("look", { preset: key })}
                    className={cn("relative aspect-square rounded-lg border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", checked ? "scale-105 border-foreground" : "border-transparent hover:scale-105")}
                    style={{ background: sw.accent }}
                    data-testid={`onb-shop-preset-${key}`}
                  >
                    <span className="absolute bottom-0.5 end-0.5 h-2.5 w-2.5 rounded-full border border-white/40" style={{ background: sw.accent2 }} />
                    {checked && <Check className="absolute start-0.5 top-0.5 h-3 w-3 text-white drop-shadow" aria-hidden />}
                  </button>
                )
              })}
            </div>
            {errorAt(errors, "look.preset") && (
              <span role="alert" className="text-xs text-destructive">
                {errorAt(errors, "look.preset")}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">{t("look.mode")}</span>
            <Segmented
              size="md"
              ariaLabel={t("look.mode")}
              value={answers.look.color_mode}
              onChange={(v) => patch("look", { color_mode: v })}
              options={[
                { value: "light", label: t("look.light") },
                { value: "dark", label: t("look.dark") },
              ]}
              testId="onb-shop-mode"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="onb-shop-color" className="text-[13px] font-medium">
              {t("look.color")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(answers.look.primary_color) ? answers.look.primary_color : "#3955d6"}
                onChange={(e) => patch("look", { primary_color: e.target.value })}
                aria-label={t("look.color")}
                className="h-[34px] w-10 shrink-0 cursor-pointer rounded-md border bg-background p-0.5"
                data-testid="onb-shop-color-swatch"
              />
              <input
                id="onb-shop-color"
                type="text"
                value={answers.look.primary_color}
                onChange={(e) => patch("look", { primary_color: e.target.value })}
                placeholder="#3955d6"
                aria-invalid={errorAt(errors, "look.primary_color") ? true : undefined}
                className={cn(inputClass, "font-mono")}
                data-testid="onb-shop-color"
              />
            </div>
            {errorAt(errors, "look.primary_color") && (
              <span role="alert" className="text-xs text-destructive">
                {errorAt(errors, "look.primary_color")}
              </span>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("analytics.title")}
        hint={t("analytics.hint")}
        actions={
          <button type="button" className={rdButton.outlineSm} onClick={() => setAnalyticsOpen((v) => !v)} aria-expanded={analyticsOpen} data-testid="onb-shop-analytics-toggle">
            {analyticsOpen ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            {analyticsOpen ? t("analytics.collapse") : t("analytics.expand")}
          </button>
        }
        bodyClassName={analyticsOpen ? "grid gap-4 p-4 sm:grid-cols-2" : undefined}
      >
        {analyticsOpen && (
          <>
            <TextField label="Google Analytics ID" value={answers.analytics.google_analytics_id} onChange={(v) => patch("analytics", { google_analytics_id: v })} placeholder="G-XXXXXXX" error={errorAt(errors, "analytics.google_analytics_id")} testId="onb-shop-ga" />
            <TextField label="Microsoft Clarity" value={answers.analytics.clarity_project_id} onChange={(v) => patch("analytics", { clarity_project_id: v })} error={errorAt(errors, "analytics.clarity_project_id")} testId="onb-shop-clarity" />
            <TextField label="Google Ads conversion ID" value={answers.analytics.google_ads_conversion_id} onChange={(v) => patch("analytics", { google_ads_conversion_id: v })} placeholder="AW-XXXXXXX" error={errorAt(errors, "analytics.google_ads_conversion_id")} testId="onb-shop-ads-id" />
            <TextField label="Google Ads purchase label" value={answers.analytics.google_ads_purchase_label} onChange={(v) => patch("analytics", { google_ads_purchase_label: v })} error={errorAt(errors, "analytics.google_ads_purchase_label")} testId="onb-shop-ads-label" />
          </>
        )}
      </SectionCard>

      <SectionCard title={t("publish.title")} hint={t("publish.hint")} bodyClassName="flex flex-col gap-3 p-4">
        <Toggle label={t("publish.now")} help={alreadyDeployed ? t("publish.alreadyDeployed") : t("publish.nowHint")} checked={answers.deploy_now} onChange={(v) => setAnswers((prev) => ({ ...prev, deploy_now: v }))} disabled={alreadyDeployed} error={errorAt(errors, "deploy_now")} testId="onb-shop-deploy" />
        <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="onb-shop-deployment">
          <TonePill tone={DEPLOY_TONE[deployStatus] ?? "neutral"} dot>
            {t(`publish.status.${["deployed", "deploying", "failed", "pending"].includes(deployStatus) ? deployStatus : "pending"}`)}
          </TonePill>
          {deployUrl && (
            <a href={deployUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-foreground underline-offset-2 hover:underline">
              {deployUrl}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

export const step: StepDefinition<ShopAnswers> = {
  key: "ecommerce_crm",
  titleKey: "steps.ecommerce_crm.title",
  Component: ShopStep,
  init: initShopAnswers,
  prepare: prepareShopAnswers,
}
