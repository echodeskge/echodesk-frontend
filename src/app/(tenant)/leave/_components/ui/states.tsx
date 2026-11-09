"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { AlertCircle, Loader2, RotateCw, type LucideIcon } from "lucide-react"
import { EmptyState } from "@/app/(tenant)/tickets/_components/primitives/empty-state"
import { getApiErrorMessage } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { leaveButton } from "./buttons"

/** Centered empty state (the tickets primitive: 40px muted icon circle, 14px title, 13px hint, action). */
export function LeaveEmptyState({
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

/**
 * Load error with a retry button. The visible hint is always translated
 * (`description` or the generic "check your connection"): API and network
 * messages are often English, which must not show in the Georgian UI. The
 * raw message goes to the hint's tooltip for support.
 */
export function LeaveErrorState({
  error,
  onRetry,
  title,
  description,
  className,
  testId = "leave-error",
}: {
  error?: unknown
  onRetry?: () => void
  title?: string
  description?: string
  className?: string
  testId?: string
}) {
  const t = useTranslations("leave.ui")
  const detail = error ? getApiErrorMessage(error) : ""
  return (
    <div data-testid={testId} className="contents" title={detail || undefined}>
      <EmptyState
        icon={AlertCircle}
        title={title ?? t("errorTitle")}
        description={description ?? t("errorHint")}
        className={cn("py-12", className)}
        action={
          onRetry ? (
            <button type="button" onClick={onRetry} className={leaveButton.outlineSm}>
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              {t("retry")}
            </button>
          ) : undefined
        }
      />
    </div>
  )
}

/** Centered 20px spinner with an accessible "Loading" label. */
export function LeaveLoading({ className, label }: { className?: string; label?: string }) {
  const t = useTranslations("leave.hr.common")
  return (
    <div role="status" className={cn("flex items-center justify-center py-16", className)} data-testid="leave-loading">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">{label ?? t("loading")}</span>
    </div>
  )
}
