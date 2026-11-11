"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export { Toolbar, ToolbarSearch, ToolbarSpacer } from "@/components/redesign/toolbar"

/** 28px toolbar select (design "All dates" / "All status" controls): 12px text, 6px radius. */
export function ToolbarSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  testId,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  /** Accessible name of the select. */
  ariaLabel: string
  className?: string
  testId?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-testid={testId}
      className={cn(
        "h-7 min-w-0 max-w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Label / control row for the compact dialogs of the section (13px label, 4px gap). */
export function Field({ label, htmlFor, hint, children, className }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** 34px input / select / textarea classes for the section's dialogs. */
export const bkgField = {
  input:
    "h-[34px] w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-50",
  select:
    "h-[34px] w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-50",
  textarea:
    "min-h-[72px] w-full min-w-0 rounded-md border border-input bg-background px-2.5 py-2 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-50",
} as const
