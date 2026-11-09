"use client"

import type { ReactNode } from "react"
import { AlertCircle, Loader2, Lock, RotateCw, type LucideIcon } from "lucide-react"
import { EmptyState } from "@/app/(tenant)/tickets/_components/primitives/empty-state"
import { getApiErrorMessage } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { rdButton } from "./buttons"

/**
 * Empty, error and loading blocks of the redesign (promoted from the leave
 * redesign). They take every text as a prop, so they work in any section's
 * intl provider; each section wraps them with its own translations
 * (`LeaveErrorState`, `EcErrorState`, ...).
 */

/** Centered empty state (the tickets primitive: 40px muted icon circle, 14px title, 13px hint, action). */
export function EmptyBlock({
  icon,
  title,
  description,
  action,
  className,
  testId,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <div data-testid={testId} className="contents">
      <EmptyState icon={icon} title={title} description={description} action={action} className={cn("py-12", className)} />
    </div>
  )
}

export interface ErrorBlockLabels {
  errorTitle: string
  errorHint: string
  noAccessTitle: string
  noAccessHint: string
  retry: string
}

/** True when the error is an HTTP 403 (no access: retrying can't help). */
export function isForbiddenError(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status === 403
}

/**
 * Load error with a retry button. The visible hint is always one of the
 * translated `labels` (or `description`): API and network messages are often
 * English, which must not show in the Georgian UI. The raw message goes to the
 * tooltip for support. A 403 shows the no-access texts and no retry.
 */
export function ErrorBlock({
  error,
  onRetry,
  labels,
  title,
  description,
  className,
  testId = "rd-error",
}: {
  error?: unknown
  onRetry?: () => void
  labels: ErrorBlockLabels
  title?: string
  description?: string
  className?: string
  testId?: string
}) {
  const detail = error ? getApiErrorMessage(error) : ""
  const forbidden = isForbiddenError(error)
  return (
    <div data-testid={testId} data-forbidden={forbidden || undefined} className="contents" title={detail || undefined}>
      <EmptyState
        icon={forbidden ? Lock : AlertCircle}
        title={title ?? (forbidden ? labels.noAccessTitle : labels.errorTitle)}
        description={description ?? (forbidden ? labels.noAccessHint : labels.errorHint)}
        className={cn("py-12", className)}
        action={
          onRetry && !forbidden ? (
            <button type="button" onClick={onRetry} className={rdButton.outlineSm}>
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              {labels.retry}
            </button>
          ) : undefined
        }
      />
    </div>
  )
}

/** Centered 20px spinner with an accessible label. */
export function LoadingBlock({ className, label, testId = "rd-loading" }: { className?: string; label: string; testId?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center py-16", className)} data-testid={testId}>
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  )
}
