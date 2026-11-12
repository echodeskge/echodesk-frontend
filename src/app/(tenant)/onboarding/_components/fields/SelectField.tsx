"use client"

import { useId, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { FieldShell, inputClass } from "./field-shell"

export interface SelectOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
}

/** Native select (works on phones and in jsdom), styled like the settings inputs. */
export function SelectField<T extends string>({
  id,
  label,
  help,
  error,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  selectClassName,
  testId,
}: {
  id?: string
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  value: T | null
  onChange: (value: T) => void
  options: SelectOption<T>[]
  /** Shown as a disabled first option while `value` is null. */
  placeholder?: string
  disabled?: boolean
  className?: string
  selectClassName?: string
  testId?: string
}) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <FieldShell id={selectId} label={label} help={help} error={error} className={className} testId={testId}>
      <div className="relative">
        <select
          id={selectId}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value as T)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          className={cn(inputClass, "appearance-none pe-8", selectClassName)}
          data-testid={testId ? `${testId}-select` : undefined}
        >
          {placeholder !== undefined && (
            <option value="" disabled={value !== null}>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </FieldShell>
  )
}
