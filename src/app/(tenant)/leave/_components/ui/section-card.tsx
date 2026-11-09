"use client"

import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Design settings section (FORM PAGE / LEAVE SETTINGS): 10px radius card,
 * 12px 16px header on muted/35 with a 13px semibold title and "· hint".
 * Children are usually `FieldRow`s or a `LeaveTable variant="flush"`.
 */
export function SectionCard({
  title,
  hint,
  actions,
  children,
  className,
  bodyClassName,
  testId,
}: {
  title: ReactNode
  hint?: ReactNode
  /** Right side of the header (e.g. "Add" button, period picker). */
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  testId?: string
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className={cn("min-w-0 overflow-hidden rounded-[10px] border bg-card", className)}
      data-testid={testId}
    >
      <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/35 px-4 py-2.5">
        <span id={id} className="text-[13px] font-semibold">
          {title}
        </span>
        {hint && <span className="min-w-0 text-xs text-muted-foreground">· {hint}</span>}
        {actions && <div className="ms-auto flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

/**
 * One settings field row: label + help on the left (flex 1 1 240px), the
 * control on the right; stacked below `sm` (design `stFieldDir`).
 */
export function FieldRow({
  label,
  help,
  children,
  htmlFor,
  disabled,
  align = "start",
  className,
  testId,
}: {
  label: ReactNode
  help?: ReactNode
  children: ReactNode
  /** id of the control, so the label is clickable. */
  htmlFor?: string
  /** Dims the row (design `f.opacity` for switches that depend on another). */
  disabled?: boolean
  align?: "start" | "center"
  className?: string
  testId?: string
}) {
  const Label = htmlFor ? "label" : "span"
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b px-4 py-3.5 last:border-b-0 sm:flex-row sm:gap-4",
        align === "center" ? "sm:items-center" : "sm:items-start",
        disabled && "opacity-50",
        className
      )}
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-col gap-0.5 sm:flex-[1_1_240px]">
        <Label {...(htmlFor ? { htmlFor } : {})} className="text-[13px] font-medium">
          {label}
        </Label>
        {help && <span className="text-xs leading-[17px] text-muted-foreground [text-wrap:pretty]">{help}</span>}
      </div>
      <div className="flex min-w-0 max-w-full flex-[0_1_auto] sm:justify-end">{children}</div>
    </div>
  )
}
