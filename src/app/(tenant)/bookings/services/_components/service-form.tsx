"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import type { BookingStaff, ServiceCategory, ServiceCreateRequest, ServiceList } from "@/api/generated/interfaces"
import { Checkbox } from "@/components/ui/checkbox"
import { bkgField, displayName, staffName } from "../../_components/ui"
import { FormField, FormGrid, FormSection, FormSheet, asBilingual, toPayload, type Bilingual } from "../../_components/catalog"

export type BookingType = "duration_based" | "fixed_slots"
export type ServiceStatus = "active" | "inactive" | "coming_soon"

export interface ServiceFormState {
  name: Bilingual
  description: Bilingual
  /** "" = no category. */
  categoryId: string
  durationMinutes: string
  bufferMinutes: string
  basePrice: string
  depositPercentage: string
  bookingType: BookingType
  status: ServiceStatus
  staffIds: number[]
}

export const EMPTY_SERVICE_FORM: ServiceFormState = {
  name: { en: "", ka: "" },
  description: { en: "", ka: "" },
  categoryId: "",
  durationMinutes: "60",
  bufferMinutes: "0",
  basePrice: "",
  depositPercentage: "0",
  bookingType: "duration_based",
  status: "active",
  staffIds: [],
}

/** The form state for an existing service (both languages, every field). */
export function serviceToForm(service: ServiceList): ServiceFormState {
  return {
    name: asBilingual(service.name),
    description: asBilingual(service.description),
    categoryId: service.category?.id ? String(service.category.id) : "",
    durationMinutes: String(service.duration_minutes ?? 60),
    bufferMinutes: String(service.buffer_time_minutes ?? 0),
    basePrice: service.base_price ?? "",
    depositPercentage: String(service.deposit_percentage ?? 0),
    bookingType: (service.booking_type as BookingType) || "duration_based",
    status: (service.status as ServiceStatus) || "active",
    staffIds: (service.staff_members ?? []).map((s) => s.id),
  }
}

export type ServiceFormErrors = Partial<Record<"name" | "durationMinutes" | "bufferMinutes" | "basePrice" | "depositPercentage", string>>

/** Field errors (translated by the caller through `t`). Price 0 is allowed: free services exist on the public site. */
export function validateServiceForm(f: ServiceFormState, t: (key: string) => string): ServiceFormErrors {
  const errors: ServiceFormErrors = {}
  if (!f.name.en.trim() && !f.name.ka.trim()) errors.name = t("nameRequired")
  const duration = Number(f.durationMinutes)
  if (f.durationMinutes.trim() === "") errors.durationMinutes = t("durationRequired")
  else if (!Number.isInteger(duration) || duration <= 0) errors.durationMinutes = t("durationPositive")
  const buffer = Number(f.bufferMinutes || 0)
  if (!Number.isInteger(buffer) || buffer < 0) errors.bufferMinutes = t("bufferInvalid")
  const price = Number(f.basePrice)
  if (f.basePrice.trim() === "") errors.basePrice = t("priceRequired")
  else if (!Number.isFinite(price) || price < 0) errors.basePrice = t("priceNotNegative")
  const deposit = Number(f.depositPercentage || 0)
  if (!Number.isFinite(deposit) || deposit < 0 || deposit > 100) errors.depositPercentage = t("depositRange")
  return errors
}

/**
 * The request body: localized `{en, ka}` objects (never a plain string),
 * numbers for the counts, a 2-decimal price, `category_id` null when none,
 * `staff_ids` always (so clearing the list sticks on PATCH).
 */
export type ServicePayload = Omit<ServiceCreateRequest, "category_id"> & { category_id: number | null }

export function serviceToPayload(f: ServiceFormState): ServicePayload {
  return {
    name: toPayload(f.name),
    description: toPayload(f.description, false),
    category_id: f.categoryId ? Number(f.categoryId) : null,
    base_price: Number(f.basePrice).toFixed(2),
    deposit_percentage: Number(f.depositPercentage || 0),
    duration_minutes: Number(f.durationMinutes),
    buffer_time_minutes: Number(f.bufferMinutes || 0),
    booking_type: f.bookingType,
    status: f.status,
    staff_ids: f.staffIds,
  }
}

/**
 * Add / edit service sheet (design "Edit Service" dialog plus the fields the
 * API has and the old form lacked: Georgian texts, category, buffer, deposit,
 * "coming soon" status and the staff who perform it).
 */
export function ServiceFormSheet({
  open,
  onOpenChange,
  service,
  categories,
  staff,
  optionsLoading,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The service being edited, or null for a new one. */
  service: ServiceList | null
  categories: ServiceCategory[]
  staff: BookingStaff[]
  optionsLoading?: boolean
  onSubmit: (payload: ServicePayload) => Promise<void>
  submitting: boolean
}) {
  const t = useTranslations("bookingsServices")
  const locale = useLocale()
  const [form, setForm] = useState<ServiceFormState>(EMPTY_SERVICE_FORM)
  const [errors, setErrors] = useState<ServiceFormErrors>({})

  useEffect(() => {
    if (open) {
      setForm(service ? serviceToForm(service) : { ...EMPTY_SERVICE_FORM })
      setErrors({})
    }
  }, [open, service])

  const set = <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }))
  }
  const setText = (key: "name" | "description", lang: "en" | "ka", value: string) => {
    setForm((f) => ({ ...f, [key]: { ...f[key], [lang]: value } }))
    if (key === "name") setErrors((e) => ({ ...e, name: undefined }))
  }
  const toggleStaff = (id: number) =>
    setForm((f) => ({ ...f, staffIds: f.staffIds.includes(id) ? f.staffIds.filter((s) => s !== id) : [...f.staffIds, id] }))

  const submit = async () => {
    const next = validateServiceForm(form, t)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    await onSubmit(serviceToPayload(form))
  }

  const sortedStaff = useMemo(() => [...staff].sort((a, b) => staffName(a).localeCompare(staffName(b))), [staff])

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={service ? t("editService") : t("createService")}
      description={service ? t("updateServiceDetails") : t("addNewService")}
      size="lg"
      onSubmit={submit}
      submitting={submitting}
      submitLabel={service ? t("update") : t("create")}
      cancelLabel={t("cancel")}
      testId="bkg-service-form"
    >
      <FormSection title={t("form.details")}>
        <FormGrid>
          <FormField label={t("form.nameEn")} htmlFor="bkg-service-name-en" required error={errors.name}>
            <input id="bkg-service-name-en" className={bkgField.input} value={form.name.en} onChange={(e) => setText("name", "en", e.target.value)} placeholder={t("serviceNamePlaceholder")} data-testid="bkg-service-name-en" />
          </FormField>
          <FormField label={t("form.nameKa")} htmlFor="bkg-service-name-ka" required>
            <input id="bkg-service-name-ka" className={bkgField.input} value={form.name.ka} onChange={(e) => setText("name", "ka", e.target.value)} data-testid="bkg-service-name-ka" />
          </FormField>
        </FormGrid>
        <FormField label={t("form.descriptionEn")} htmlFor="bkg-service-desc-en">
          <textarea id="bkg-service-desc-en" className={bkgField.textarea} rows={3} value={form.description.en} onChange={(e) => setText("description", "en", e.target.value)} placeholder={t("descriptionPlaceholder")} data-testid="bkg-service-desc-en" />
        </FormField>
        <FormField label={t("form.descriptionKa")} htmlFor="bkg-service-desc-ka">
          <textarea id="bkg-service-desc-ka" className={bkgField.textarea} rows={3} value={form.description.ka} onChange={(e) => setText("description", "ka", e.target.value)} data-testid="bkg-service-desc-ka" />
        </FormField>
        <FormField label={t("form.category")} htmlFor="bkg-service-category" help={optionsLoading ? t("form.loadingOptions") : undefined}>
          <select id="bkg-service-category" className={bkgField.select} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} data-testid="bkg-service-category">
            <option value="">{t("form.noCategory")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {displayName(c, locale)}
              </option>
            ))}
          </select>
        </FormField>
      </FormSection>

      <FormSection title={t("form.pricing")}>
        <FormGrid>
          <FormField label={t("durationMinutes")} htmlFor="bkg-service-duration" required error={errors.durationMinutes}>
            <input id="bkg-service-duration" type="number" min="1" step="1" inputMode="numeric" className={`${bkgField.input} tabular-nums`} value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} data-testid="bkg-service-duration" />
          </FormField>
          <FormField label={t("form.buffer")} htmlFor="bkg-service-buffer" help={t("form.bufferHelp")} error={errors.bufferMinutes}>
            <input id="bkg-service-buffer" type="number" min="0" step="1" inputMode="numeric" className={`${bkgField.input} tabular-nums`} value={form.bufferMinutes} onChange={(e) => set("bufferMinutes", e.target.value)} data-testid="bkg-service-buffer" />
          </FormField>
          <FormField label={t("priceLabel")} htmlFor="bkg-service-price" required help={t("form.priceHelp")} error={errors.basePrice}>
            <input id="bkg-service-price" type="number" min="0" step="0.01" inputMode="decimal" className={`${bkgField.input} tabular-nums`} value={form.basePrice} onChange={(e) => set("basePrice", e.target.value)} data-testid="bkg-service-price" />
          </FormField>
          <FormField label={t("form.deposit")} htmlFor="bkg-service-deposit" help={t("form.depositHelp")} error={errors.depositPercentage}>
            <input id="bkg-service-deposit" type="number" min="0" max="100" step="1" inputMode="numeric" className={`${bkgField.input} tabular-nums`} value={form.depositPercentage} onChange={(e) => set("depositPercentage", e.target.value)} data-testid="bkg-service-deposit" />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title={t("form.booking")}>
        <FormGrid>
          <FormField label={t("bookingType")} htmlFor="bkg-service-type">
            <select id="bkg-service-type" className={bkgField.select} value={form.bookingType} onChange={(e) => set("bookingType", e.target.value as BookingType)} data-testid="bkg-service-type">
              <option value="duration_based">{t("durationBased")}</option>
              <option value="fixed_slots">{t("fixedSlots")}</option>
            </select>
          </FormField>
          <FormField label={t("statusLabel")} htmlFor="bkg-service-status">
            <select id="bkg-service-status" className={bkgField.select} value={form.status} onChange={(e) => set("status", e.target.value as ServiceStatus)} data-testid="bkg-service-status">
              <option value="active">{t("active")}</option>
              <option value="inactive">{t("inactive")}</option>
              <option value="coming_soon">{t("comingSoon")}</option>
            </select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title={t("form.staff")} hint={t("form.staffHint", { count: form.staffIds.length })}>
        {sortedStaff.length === 0 ? (
          <p className="text-xs text-muted-foreground">{optionsLoading ? t("form.loadingOptions") : t("form.noStaff")}</p>
        ) : (
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border p-2" data-testid="bkg-service-staff">
            {sortedStaff.map((s) => {
              const id = `bkg-service-staff-${s.id}`
              return (
                <label key={s.id} htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-muted/50">
                  <Checkbox id={id} checked={form.staffIds.includes(s.id)} onCheckedChange={() => toggleStaff(s.id)} />
                  <span className="min-w-0 truncate">{staffName(s)}</span>
                  {!s.is_active_for_bookings && <span className="ms-auto text-[11px] text-muted-foreground">{t("inactive")}</span>}
                </label>
              )
            })}
          </div>
        )}
      </FormSection>
    </FormSheet>
  )
}
