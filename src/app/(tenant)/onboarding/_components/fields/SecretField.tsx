"use client"

import { useId, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { SecretInput } from "@/components/redesign/settings/controls"
import { cn } from "@/lib/utils"
import { FieldShell } from "./field-shell"

/** Masked input with an eye button (bot tokens, API keys, client secrets). */
export function SecretField({
  id,
  label,
  help,
  error,
  value,
  onChange,
  placeholder,
  disabled,
  mono = true,
  className,
  inputClassName,
  testId,
}: {
  id?: string
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  mono?: boolean
  className?: string
  inputClassName?: string
  testId?: string
}) {
  const t = useTranslations("onboarding.fields.secret")
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell id={inputId} label={label} help={help} error={error} className={className} testId={testId}>
      <SecretInput
        id={inputId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        mono={mono}
        showLabel={t("show")}
        hideLabel={t("hide")}
        className={cn("sm:max-w-[360px]", inputClassName)}
        testId={testId ? `${testId}-input` : undefined}
      />
    </FieldShell>
  )
}
