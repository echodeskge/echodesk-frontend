"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Label + help above, error below: the stacked layout of the wizard fields. */
export function FieldShell({
  id,
  label,
  help,
  error,
  children,
  className,
  testId,
  as = "label",
}: {
  id?: string
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  children: ReactNode
  className?: string
  testId?: string
  /** `div` when the control is a group (cards, grid), so the label is not clickable. */
  as?: "label" | "div"
}) {
  const Label = as
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)} data-testid={testId}>
      {label && (
        <Label {...(as === "label" && id ? { htmlFor: id } : {})} className="text-[13px] font-medium">
          {label}
        </Label>
      )}
      {children}
      {help && !error && <span className="text-xs leading-[17px] text-muted-foreground [text-wrap:pretty]">{help}</span>}
      {error && (
        <span role="alert" className="text-xs text-destructive" data-testid={testId ? `${testId}-error` : undefined}>
          {error}
        </span>
      )}
    </div>
  )
}

/** 34px input of the settings rows, plus a red border while `aria-invalid`. */
export const inputClass =
  "h-[34px] w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive"
