"use client"

import { useId, type ReactNode } from "react"
import { SettingsToggle } from "@/components/redesign/settings/controls"
import { cn } from "@/lib/utils"

/** Switch row: label + help on the left, the design switch on the right. */
export function Toggle({
  id,
  label,
  help,
  checked,
  onChange,
  disabled,
  error,
  className,
  testId,
}: {
  id?: string
  label: ReactNode
  help?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  error?: string | null
  className?: string
  testId?: string
}) {
  const autoId = useId()
  const switchId = id ?? autoId
  return (
    <div className={cn("flex flex-col gap-1", className)} data-testid={testId}>
      <div className={cn("flex items-start justify-between gap-4", disabled && "opacity-50")}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <label htmlFor={switchId} className="text-[13px] font-medium">
            {label}
          </label>
          {help && <span className="text-xs leading-[17px] text-muted-foreground [text-wrap:pretty]">{help}</span>}
        </div>
        <SettingsToggle
          id={switchId}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          data-testid={testId ? `${testId}-switch` : undefined}
        />
      </div>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
