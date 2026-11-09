"use client"

import type { ReactNode } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * The 44px toolbar row under the header / stat strip (design Clients toolbar:
 * min-height 44, padding 6px 16px, bottom border, wraps on mobile).
 * `inset`: no border and no side padding, for toolbars inside a padded page.
 */
export function LeaveToolbar({
  children,
  inset,
  className,
  testId,
}: {
  children: ReactNode
  inset?: boolean
  className?: string
  testId?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 min-w-0 shrink-0 flex-wrap items-center gap-2",
        inset ? "" : "border-b px-4 py-1.5",
        className
      )}
      data-testid={testId}
    >
      {children}
    </div>
  )
}

/** Pushes the following toolbar items to the right. */
export function ToolbarSpacer() {
  return <span aria-hidden className="ml-auto" />
}

/** 28px search input with a leading icon and a clear button (design: 12px text, 26px left padding). */
export function ToolbarSearch({
  value,
  onChange,
  placeholder,
  clearLabel,
  className,
  testId,
}: {
  value: string
  onChange: (value: string) => void
  /** Also the accessible name. */
  placeholder: string
  clearLabel?: string
  className?: string
  testId?: string
}) {
  return (
    <div className={cn("relative min-w-[160px] max-w-[260px] flex-1", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute start-2 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        data-testid={testId}
        className="h-7 w-full rounded-md border border-input bg-background pe-7 ps-[26px] text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && clearLabel && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          title={clearLabel}
          className="absolute end-1 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  )
}
