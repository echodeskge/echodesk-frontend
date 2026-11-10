"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Small page-local pieces for the Channels settings pages (ST-02). The design
 * FORM PAGE has label/control rows (`FieldRow`); these cover the blocks that
 * do not fit a row: full-width text areas, grids and lists inside a section.
 */

/** Full-width block inside a `SettingsSection`, with the row padding and divider. */
export function SectionBlock({
  children,
  className,
  testId,
}: {
  children: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 border-b px-4 py-3.5 last:border-b-0", className)} data-testid={testId}>
      {children}
    </div>
  )
}

/** Label + optional help above a full-width control (13px / 12px, like `FieldRow`). */
export function StackLabel({ htmlFor, label, help }: { htmlFor?: string; label: ReactNode; help?: ReactNode }) {
  const Label = htmlFor ? "label" : "span"
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Label {...(htmlFor ? { htmlFor } : {})} className="text-[13px] font-medium">
        {label}
      </Label>
      {help && <span className="text-xs leading-[17px] text-muted-foreground [text-wrap:pretty]">{help}</span>}
    </div>
  )
}

/** 34px select trigger of the settings rows. */
export const selectTriggerClass = "h-[34px] text-[13px]"

/** Text area of the settings rows (13px, 6px radius). */
export const textareaClass = "min-h-[64px] rounded-md text-[13px]"

/** 6px coloured dot before a channel label (sound rows, platform tabs). */
export function ChannelDot({ className }: { className: string }) {
  return <span aria-hidden className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", className)} />
}
