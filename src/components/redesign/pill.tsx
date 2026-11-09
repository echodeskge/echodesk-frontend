"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { TONE_CLASS, TONE_DOT, type Tone } from "./tones"

/** Design badge: 20px tall, 7px side padding, 4px radius, 11px medium text, tinted border/fill. */
export function TonePill({
  tone,
  children,
  dot,
  className,
  title,
  testId,
}: {
  tone: Tone
  children: ReactNode
  /** A 6px dot before the text (statuses). */
  dot?: boolean
  className?: string
  title?: string
  testId?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded border px-[7px] text-[11px] font-medium",
        TONE_CLASS[tone],
        className
      )}
      data-tone={tone}
      title={title}
      data-testid={testId}
    >
      {dot && <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />}
      <span className="truncate">{children}</span>
    </span>
  )
}
