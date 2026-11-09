"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import type { LucideIcon } from "lucide-react"
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/redesign/states"

/** Centered empty state (the tickets primitive: 40px muted icon circle, 14px title, 13px hint, action). */
export function LeaveEmptyState(props: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  testId?: string
}) {
  return <EmptyBlock {...props} />
}

/**
 * Load error with a retry button, in leave's texts (`leave.ui.*`). See the
 * shared `ErrorBlock`: translated hint, raw message as tooltip, 403 = no access.
 */
export function LeaveErrorState({
  testId = "leave-error",
  ...props
}: {
  error?: unknown
  onRetry?: () => void
  title?: string
  description?: string
  className?: string
  testId?: string
}) {
  const t = useTranslations("leave.ui")
  return (
    <ErrorBlock
      {...props}
      testId={testId}
      labels={{
        errorTitle: t("errorTitle"),
        errorHint: t("errorHint"),
        noAccessTitle: t("noAccessTitle"),
        noAccessHint: t("noAccessHint"),
        retry: t("retry"),
      }}
    />
  )
}

/** Centered 20px spinner with an accessible "Loading" label. */
export function LeaveLoading({ className, label }: { className?: string; label?: string }) {
  const t = useTranslations("leave.hr.common")
  return <LoadingBlock className={className} label={label ?? t("loading")} testId="leave-loading" />
}
