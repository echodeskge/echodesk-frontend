"use client"

import type { ReactNode } from "react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

/**
 * Form bits for the LV-04 edit dialogs (leave type, public holiday):
 * 13px labels, 34px inputs, switches as bordered rows (design settings
 * field rows, compact). Only layout: every field keeps its own handlers.
 */

/** Class for shadcn <Input> / <SelectTrigger> inside the dialogs (34px, 13px). */
export const dialogControl = "h-[34px] text-[13px]"

/** Label + control (+ optional 12px hint) stacked. */
export function DialogField({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium leading-none">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-[17px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** A titled group of fields (11px uppercase muted heading). */
export function DialogGroup({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div role="group" className={cn("flex min-w-0 flex-col gap-3", className)}>
      {title && <div className="text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground">{title}</div>}
      {children}
    </div>
  )
}

/** Bordered list of switch rows. */
export function SwitchList({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border">{children}</div>
}

/** One switch row: label + optional help on the left, the switch on the right. */
export function SwitchRow({
  id,
  label,
  help,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  label: ReactNode
  help?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b px-3 py-2.5 last:border-b-0", disabled && "opacity-50")}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-[13px] font-medium">
          {label}
        </label>
        {help && <span className="text-xs leading-[17px] text-muted-foreground [text-wrap:pretty]">{help}</span>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
