"use client"

import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { FieldShell, inputClass } from "./field-shell"

/** Numeric input; an empty box gives `null`. `suffix` sits inside the box ("h", "%", "GEL"). */
export function NumberField({
  id,
  label,
  help,
  error,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  placeholder,
  disabled,
  className,
  testId,
}: {
  id?: string
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  testId?: string
}) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell id={inputId} label={label} help={help} error={error} className={className} testId={testId}>
      <div className="relative w-full sm:w-[160px]">
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === "") return onChange(null)
            const n = Number(raw)
            onChange(Number.isFinite(n) ? n : null)
          }}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          className={cn(inputClass, "tabular-nums", suffix && "pe-10")}
          data-testid={testId ? `${testId}-input` : undefined}
        />
        {suffix && (
          <span aria-hidden className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  )
}
