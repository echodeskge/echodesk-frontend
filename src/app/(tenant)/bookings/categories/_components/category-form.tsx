"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import type { ServiceCategory, ServiceCategoryRequest } from "@/api/generated/interfaces"
import { Switch } from "@/components/ui/switch"
import { bkgField } from "../../_components/ui"
import { FormField, FormGrid, FormSection, FormSheet, FormSwitchRow, asBilingual, toPayload, type Bilingual } from "../../_components/catalog"

export interface CategoryFormState {
  name: Bilingual
  description: Bilingual
  icon: string
  displayOrder: string
  isActive: boolean
}

export const EMPTY_CATEGORY_FORM: CategoryFormState = {
  name: { en: "", ka: "" },
  description: { en: "", ka: "" },
  icon: "",
  displayOrder: "0",
  isActive: true,
}

export function categoryToForm(c: ServiceCategory): CategoryFormState {
  return {
    name: asBilingual(c.name),
    description: asBilingual(c.description),
    icon: c.icon ?? "",
    displayOrder: String(c.display_order ?? 0),
    isActive: c.is_active ?? true,
  }
}

/** Localized `{en, ka}` texts, icon, order and the active flag: the full API field set. */
export function categoryToPayload(f: CategoryFormState): ServiceCategoryRequest {
  return {
    name: toPayload(f.name),
    description: toPayload(f.description, false),
    icon: f.icon.trim(),
    display_order: Number(f.displayOrder || 0),
    is_active: f.isActive,
  }
}

export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ServiceCategory | null
  onSubmit: (payload: ServiceCategoryRequest) => Promise<void>
  submitting: boolean
}) {
  const t = useTranslations("bookingsCategories")
  const [form, setForm] = useState<CategoryFormState>(EMPTY_CATEGORY_FORM)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(category ? categoryToForm(category) : { ...EMPTY_CATEGORY_FORM })
      setNameError(null)
    }
  }, [open, category])

  const setText = (key: "name" | "description", lang: "en" | "ka", value: string) => {
    setForm((f) => ({ ...f, [key]: { ...f[key], [lang]: value } }))
    if (key === "name") setNameError(null)
  }

  const submit = async () => {
    if (!form.name.en.trim() && !form.name.ka.trim()) {
      setNameError(t("nameRequired"))
      return
    }
    const order = Number(form.displayOrder || 0)
    await onSubmit(categoryToPayload({ ...form, displayOrder: Number.isFinite(order) ? String(order) : "0" }))
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={category ? t("editCategory") : t("createCategory")}
      description={category ? t("updateCategoryDetails") : t("addNewCategory")}
      size="md"
      onSubmit={submit}
      submitting={submitting}
      submitLabel={category ? t("update") : t("create")}
      cancelLabel={t("cancel")}
      testId="bkg-category-form"
    >
      <FormSection title={t("form.details")}>
        <FormGrid>
          <FormField label={t("form.nameEn")} htmlFor="bkg-category-name-en" required error={nameError}>
            <input id="bkg-category-name-en" className={bkgField.input} value={form.name.en} onChange={(e) => setText("name", "en", e.target.value)} placeholder={t("categoryNamePlaceholder")} data-testid="bkg-category-name-en" />
          </FormField>
          <FormField label={t("form.nameKa")} htmlFor="bkg-category-name-ka" required>
            <input id="bkg-category-name-ka" className={bkgField.input} value={form.name.ka} onChange={(e) => setText("name", "ka", e.target.value)} data-testid="bkg-category-name-ka" />
          </FormField>
        </FormGrid>
        <FormField label={t("form.descriptionEn")} htmlFor="bkg-category-desc-en">
          <textarea id="bkg-category-desc-en" className={bkgField.textarea} rows={2} value={form.description.en} onChange={(e) => setText("description", "en", e.target.value)} placeholder={t("descriptionPlaceholder")} data-testid="bkg-category-desc-en" />
        </FormField>
        <FormField label={t("form.descriptionKa")} htmlFor="bkg-category-desc-ka">
          <textarea id="bkg-category-desc-ka" className={bkgField.textarea} rows={2} value={form.description.ka} onChange={(e) => setText("description", "ka", e.target.value)} data-testid="bkg-category-desc-ka" />
        </FormField>
      </FormSection>
      <FormSection title={t("form.display")}>
        <FormGrid>
          <FormField label={t("form.icon")} htmlFor="bkg-category-icon" help={t("form.iconHelp")}>
            <input id="bkg-category-icon" className={bkgField.input} value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="scissors" data-testid="bkg-category-icon" />
          </FormField>
          <FormField label={t("form.displayOrder")} htmlFor="bkg-category-order" help={t("form.displayOrderHelp")}>
            <input id="bkg-category-order" type="number" min="0" step="1" inputMode="numeric" className={`${bkgField.input} tabular-nums`} value={form.displayOrder} onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))} data-testid="bkg-category-order" />
          </FormField>
        </FormGrid>
        <FormSwitchRow label={t("form.isActive")} help={t("form.isActiveHelp")} htmlFor="bkg-category-active">
          <Switch id="bkg-category-active" checked={form.isActive} onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))} />
        </FormSwitchRow>
      </FormSection>
    </FormSheet>
  )
}
