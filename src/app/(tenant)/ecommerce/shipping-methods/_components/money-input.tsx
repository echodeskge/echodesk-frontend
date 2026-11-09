"use client"

import { Input } from "@/components/ui/input"
import { CURRENCY_SIGN, ecField } from "../../_components/ui"
import { cn } from "@/lib/utils"

/** 34px decimal input with the ₾ sign on the right and tabular figures. Value stays the raw string. */
export function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        className={cn(ecField.input, "pe-8 tabular-nums")}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[13px] text-muted-foreground">
        {CURRENCY_SIGN}
      </span>
    </div>
  )
}
