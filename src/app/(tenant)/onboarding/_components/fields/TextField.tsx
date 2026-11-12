"use client"

import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { FieldShell, inputClass } from "./field-shell"

export function TextField({
  id,
  label,
  help,
  error,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  autoComplete,
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
  type?: "text" | "email" | "tel" | "url" | "password"
  disabled?: boolean
  autoComplete?: string
  className?: string
  inputClassName?: string
  testId?: string
}) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell id={inputId} label={label} help={help} error={error} className={className} testId={testId}>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={cn(inputClass, inputClassName)}
        data-testid={testId ? `${testId}-input` : undefined}
      />
    </FieldShell>
  )
}
