"use client"

import { useRef, type KeyboardEvent } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  /** Small tabular count after the label (e.g. pending requests). */
  count?: number | null
  disabled?: boolean
}

export interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  /** Accessible name of the group. */
  ariaLabel: string
  /**
   * `sm`: 28px toolbar filter (design Clients tabs / Stats ranges).
   * `md`: 30px form choice that wraps (design settings `isChoice`).
   */
  size?: "sm" | "md"
  /** Stretch the segments over the full width (mobile sheets). */
  stretch?: boolean
  className?: string
  testId?: string
}

/**
 * Muted segmented control with a raised active segment (radio group, arrow
 * keys move and select). The `sm` size scrolls sideways instead of overflowing
 * the page on narrow screens.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "sm",
  stretch,
  className,
  testId,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const enabled = options.filter((o) => !o.disabled)

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: T) => {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"]
    if (!keys.includes(e.key) || enabled.length === 0) return
    e.preventDefault()
    const at = enabled.findIndex((o) => o.value === current)
    let next = at
    if (e.key === "Home") next = 0
    else if (e.key === "End") next = enabled.length - 1
    else next = (at + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length
    const target = enabled[next]
    onChange(target.value)
    refs.current[options.indexOf(target)]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-slot="leave-segmented"
      data-testid={testId}
      className={cn(
        "inline-flex max-w-full shrink-0 gap-0.5 bg-muted p-0.5",
        size === "sm"
          ? "h-7 overflow-x-auto rounded-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "min-h-[30px] flex-wrap rounded-[7px]",
        stretch && "flex w-full",
        className
      )}
    >
      {options.map((o, i) => {
        const selected = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={o.disabled}
            data-state={selected ? "on" : "off"}
            onClick={() => !selected && onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, value)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              size === "sm" ? "rounded px-2.5" : "h-[26px] rounded-[5px] px-2.5",
              stretch && "flex-1",
              selected
                ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon aria-hidden size={14} />}
            {o.label}
            {typeof o.count === "number" && (
              <span
                className={cn(
                  "min-w-4 rounded-full px-1 text-center text-[10px] leading-4 tabular-nums",
                  selected ? "bg-muted text-foreground" : "bg-background/60 text-muted-foreground"
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
