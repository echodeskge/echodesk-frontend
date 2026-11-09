"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { leaveStatusKey } from "../../_lib/hr-utils"
import { TONE_CLASS, TONE_DOT, requestStatusTone, type LeaveTone } from "./tones"

/** Design badge: 20px tall, 7px side padding, 4px radius, 11px medium text, tinted border/fill. */
export function TonePill({
  tone,
  children,
  dot,
  className,
  title,
  testId,
}: {
  tone: LeaveTone
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

/** Leave request status pill (every status incl. awaiting_substitutes). */
export function RequestStatusPill({ status, className }: { status: string; className?: string }) {
  const t = useTranslations("leave")
  return (
    <TonePill tone={requestStatusTone(status)} dot className={className} testId="leave-status-pill">
      {t(leaveStatusKey(status))}
    </TonePill>
  )
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/** The leave type's colour when it is a valid hex colour, else null (falls back to muted). */
export function safeLeaveColor(color: string | null | undefined): string | null {
  return color && HEX.test(color.trim()) ? color.trim() : null
}

/**
 * Leave type as a colour dot + name (replaces white text on the type colour,
 * which fails contrast on light colours). `variant="chip"` adds the 20px
 * outlined chip for places where the type stands alone.
 */
export function LeaveTypeChip({
  name,
  color,
  variant = "dot",
  className,
}: {
  name: string
  color?: string | null
  variant?: "dot" | "chip"
  className?: string
}) {
  const c = safeLeaveColor(color)
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5",
        variant === "chip" ? "h-5 rounded border border-border px-1.5 text-[11px] font-medium" : "text-[13px]",
        className
      )}
    >
      <span
        aria-hidden
        className={cn("h-2 w-2 shrink-0 rounded-full", c ? "" : "bg-muted-foreground/50")}
        style={c ? { backgroundColor: c } : undefined}
      />
      <span className="truncate">{name}</span>
    </span>
  )
}
