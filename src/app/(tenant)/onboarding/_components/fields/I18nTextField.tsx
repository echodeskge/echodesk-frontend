"use client"

import { useId, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { FieldShell, inputClass } from "./field-shell"

export interface I18nText {
  ka: string
  en: string
}

export const EMPTY_I18N: I18nText = { ka: "", en: "" }

/** A ka/en pair (names of services, leave types, messages…). */
export function I18nTextField({
  id,
  label,
  help,
  error,
  value,
  onChange,
  placeholder,
  multiline,
  disabled,
  className,
  testId,
}: {
  id?: string
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  value: I18nText
  onChange: (value: I18nText) => void
  placeholder?: Partial<I18nText>
  multiline?: boolean
  disabled?: boolean
  className?: string
  testId?: string
}) {
  const t = useTranslations("onboarding.fields.i18n")
  const autoId = useId()
  const baseId = id ?? autoId
  const langs: Array<keyof I18nText> = ["ka", "en"]
  return (
    <FieldShell as="div" label={label} help={help} error={error} className={className} testId={testId}>
      <div className="flex flex-col gap-1.5 sm:flex-row">
        {langs.map((lang) => {
          const inputId = `${baseId}-${lang}`
          const common = {
            id: inputId,
            value: value[lang] ?? "",
            placeholder: placeholder?.[lang],
            disabled,
            "aria-label": `${typeof label === "string" ? label : ""} ${t(lang)}`.trim(),
            "aria-invalid": error ? (true as const) : undefined,
            "data-testid": testId ? `${testId}-${lang}` : undefined,
          }
          return (
            <div key={lang} className="relative min-w-0 flex-1">
              <span
                aria-hidden
                className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 rounded bg-muted px-1 text-[10px] font-semibold text-muted-foreground"
              >
                {t(lang)}
              </span>
              {multiline ? (
                <textarea
                  {...common}
                  rows={3}
                  onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
                  className={cn(inputClass, "h-auto min-h-[72px] py-2 ps-10")}
                />
              ) : (
                <input
                  {...common}
                  type="text"
                  onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
                  className={cn(inputClass, "ps-10")}
                />
              )}
            </div>
          )
        })}
      </div>
    </FieldShell>
  )
}
