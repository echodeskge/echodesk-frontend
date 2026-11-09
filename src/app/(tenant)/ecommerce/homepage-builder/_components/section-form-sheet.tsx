"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import type { DisplayModeEnum, HomepageSection, HomepageSectionRequest, ItemList, SectionTypeEnum } from "@/api/generated"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField, FormGrid, FormSection, FormSheet, ecField } from "../../_components/ui"
import { displayModeLabel, sectionTypeLabel } from "../_lib/labels"

/**
 * Helper to cast string values to the opaque generated enum types.
 * The generated SectionTypeEnum and DisplayModeEnum are `{ [key: string]: any }`,
 * so string values are compatible at runtime but TypeScript requires an explicit cast.
 */
function asSectionType(value: string): SectionTypeEnum {
  return value as unknown as SectionTypeEnum
}

function asDisplayMode(value: string): DisplayModeEnum {
  return value as unknown as DisplayModeEnum
}

export interface SectionChoices {
  section_types: { value: string; label: string }[]
  display_modes: { value: string; label: string }[]
}

interface FormState {
  title: { en: string; ka: string }
  subtitle: { en: string; ka: string }
  section_type: string
  display_mode: string
  item_list: number | null
  attribute_key: string
  attribute_value: string
  background_color: string
  background_image_url: string
  text_color: string
  settings: Record<string, unknown>
}

const EMPTY: FormState = {
  title: { en: "", ka: "" },
  subtitle: { en: "", ka: "" },
  section_type: "hero_banner",
  display_mode: "slider",
  item_list: null,
  attribute_key: "",
  attribute_value: "",
  background_color: "",
  background_image_url: "",
  text_color: "",
  settings: {},
}

/** Add / edit a homepage section (FormSheet lg). Same request body as before. */
export function SectionFormSheet({
  open,
  onClose,
  section,
  choices,
  itemLists,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onClose: () => void
  section: HomepageSection | null
  choices?: SectionChoices
  itemLists: ItemList[]
  onSubmit: (data: HomepageSectionRequest) => void
  isLoading: boolean
}) {
  const t = useTranslations("homepageBuilder")
  const tCommon = useTranslations("common")
  const [formData, setFormData] = useState<FormState>(EMPTY)
  const [attempted, setAttempted] = useState(false)

  // Reset form when opening/closing
  useEffect(() => {
    setAttempted(false)
    if (open && section) {
      setFormData({
        title: typeof section.title === "object" ? section.title : { en: section.title as string, ka: "" },
        subtitle: typeof section.subtitle === "object" ? section.subtitle : { en: "", ka: "" },
        section_type: String(section.section_type),
        display_mode: String(section.display_mode || "grid"),
        item_list: section.item_list || null,
        attribute_key: section.attribute_key || "",
        attribute_value: section.attribute_value || "",
        background_color: section.background_color || "",
        background_image_url: section.background_image_url || "",
        text_color: section.text_color || "",
        settings: section.settings || {},
      })
    } else if (open) {
      setFormData(EMPTY)
    }
  }, [open, section])

  // The English title is required (it was a native `required` input).
  const titleMissing = !formData.title.en?.trim()

  const handleSubmit = () => {
    setAttempted(true)
    if (titleMissing) return
    const requestData: HomepageSectionRequest = {
      title: formData.title,
      subtitle: formData.subtitle,
      section_type: asSectionType(formData.section_type),
      display_mode: asDisplayMode(formData.display_mode),
      item_list: formData.item_list || undefined,
      attribute_key: formData.attribute_key || undefined,
      attribute_value: formData.attribute_value || undefined,
      background_color: formData.background_color || undefined,
      background_image_url: formData.background_image_url || undefined,
      text_color: formData.text_color || undefined,
      settings: formData.settings,
    }
    onSubmit(requestData)
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={section ? t("editSection") : t("addNewSection")}
      description={t("sectionFormDescription")}
      size="lg"
      onSubmit={handleSubmit}
      submitting={isLoading}
      submitLabel={isLoading ? tCommon("saving") : section ? tCommon("update") : tCommon("create")}
      cancelLabel={tCommon("cancel")}
      testId="hb-section-sheet"
    >
      <FormSection title={t("form.titleSection")}>
        <FormGrid>
          <FormField
            label={t("titleEnglish")}
            htmlFor="hb-title-en"
            required
            error={attempted && titleMissing ? t("form.titleRequired") : undefined}
          >
            <Input
              id="hb-title-en"
              className={ecField.input}
              value={formData.title.en}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: { ...prev.title, en: e.target.value } }))}
              placeholder="Featured Products"
              aria-invalid={attempted && titleMissing ? true : undefined}
              required
            />
          </FormField>
          <FormField label={t("titleGeorgian")} htmlFor="hb-title-ka">
            <Input
              id="hb-title-ka"
              className={ecField.input}
              value={formData.title.ka}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: { ...prev.title, ka: e.target.value } }))}
              placeholder="რჩეული პროდუქტები"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title={t("form.layoutSection")}>
        <FormGrid>
          <FormField label={t("sectionType")} htmlFor="hb-section-type">
            <Select
              value={formData.section_type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, section_type: value }))}
            >
              <SelectTrigger id="hb-section-type" className={`${ecField.select} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {choices?.section_types.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {sectionTypeLabel(t, type.value, choices.section_types)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t("displayMode")} htmlFor="hb-display-mode">
            <Select
              value={formData.display_mode}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, display_mode: value }))}
            >
              <SelectTrigger id="hb-display-mode" className={`${ecField.select} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {choices?.display_modes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {displayModeLabel(t, mode.value, choices.display_modes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title={t("form.contentSection")} hint={t("form.contentHint")}>
        <FormField label={t("linkToItemList")} htmlFor="hb-item-list">
          <Select
            value={formData.item_list?.toString() || "none"}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, item_list: value === "none" ? null : parseInt(value) }))
            }
          >
            <SelectTrigger id="hb-item-list" className={`${ecField.select} w-full`}>
              <SelectValue placeholder={t("selectItemList")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("noItemList")}</SelectItem>
              {itemLists.map((list) => (
                <SelectItem key={list.id} value={list.id.toString()}>
                  {list.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>

      <FormSection title={t("form.appearanceSection")}>
        <FormGrid>
          <FormField label={t("backgroundColor")} htmlFor="hb-bg-color">
            <div className="relative">
              <Input
                id="hb-bg-color"
                className={`${ecField.input} font-mono ${formData.background_color ? "ps-9" : ""}`}
                value={formData.background_color}
                onChange={(e) => setFormData((prev) => ({ ...prev, background_color: e.target.value }))}
                placeholder="#f5f5f5"
              />
              {formData.background_color && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded border"
                  style={{ background: formData.background_color }}
                />
              )}
            </div>
          </FormField>
          <FormField label={t("backgroundImageUrl")} htmlFor="hb-bg-image">
            <Input
              id="hb-bg-image"
              className={ecField.input}
              value={formData.background_image_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, background_image_url: e.target.value }))}
              placeholder="https://..."
            />
          </FormField>
        </FormGrid>
      </FormSection>
    </FormSheet>
  )
}
