"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export { SettingsPageHeader as PageHeader } from "@/app/(tenant)/settings/templates/_components/settings-page-header"

/**
 * A section's route shell (rendered by the section layout): a full-height
 * column that is also the scroll container, so a page can either scroll as a
 * whole (`Page`) or pin its stat strip + toolbar and scroll only its table
 * (`Page fill`).
 */
export function PageShell({ children, testId = "rd-shell" }: { children: ReactNode; testId?: string }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto" data-testid={testId}>
      {children}
    </div>
  )
}

const WIDTHS = {
  /** Design LEAVE SETTINGS / FORM PAGE */
  narrow: "max-w-[720px]",
  /** Design STATS page */
  medium: "max-w-[960px]",
  /** Design LIST PAGE */
  wide: "max-w-[1040px]",
  full: "",
} as const

export type PageWidth = keyof typeof WIDTHS

export interface PageProps {
  children: ReactNode
  /**
   * `fill`: full-bleed, no padding, the page fills the height and its table
   * scrolls (Clients/Tickets list layout). Otherwise a padded column
   * (16px gutter on mobile, 24px from `sm`) that scrolls with the shell.
   */
  fill?: boolean
  /** Max content width of a padded page (ignored with `fill`). */
  width?: PageWidth
  /** Vertical rhythm between blocks of a padded page: 16 (default) or 20 (forms). */
  gap?: 16 | 20
  className?: string
  testId?: string
}

/** One page body. */
export function Page({ children, fill, width = "full", gap = 16, className, testId }: PageProps) {
  if (fill) {
    return (
      <section className={cn("flex min-h-0 w-full flex-1 flex-col", className)} data-testid={testId}>
        {children}
      </section>
    )
  }
  return (
    <section className={cn("w-full p-4 sm:p-6", className)} data-testid={testId}>
      <div className={cn("mx-0 flex w-full min-w-0 flex-col", gap === 20 ? "gap-5" : "gap-4", WIDTHS[width])}>
        {children}
      </div>
    </section>
  )
}

/** Banner row above content (e.g. "2 colleagues are waiting for your consent"). */
export function PageBanner({
  icon,
  children,
  action,
  tone = "primary",
  className,
}: {
  icon?: ReactNode
  children: ReactNode
  action?: ReactNode
  tone?: "primary" | "warning"
  className?: string
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2 text-[13px]",
        tone === "primary" ? "border-primary/25 bg-primary/5" : "border-amber-500/40 bg-amber-500/10",
        className
      )}
    >
      {icon && <span className="flex shrink-0 text-muted-foreground">{icon}</span>}
      <span className="min-w-0 flex-1 [text-wrap:pretty]">{children}</span>
      {action}
    </div>
  )
}
