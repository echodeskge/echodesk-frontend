"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import type { LucideIcon } from "lucide-react"
import { EmptyBlock, ErrorBlock, LoadingBlock, type ErrorBlockLabels } from "@/components/redesign/states"

/** The shared error texts of the bookings catalog (`bookingsUi.*`). */
export function useBookingsErrorLabels(): ErrorBlockLabels {
  const t = useTranslations("bookingsUi")
  return {
    errorTitle: t("errorTitle"),
    errorHint: t("errorHint"),
    noAccessTitle: t("noAccessTitle"),
    noAccessHint: t("noAccessHint"),
    retry: t("retry"),
  }
}

/** Centered empty state (40px muted icon circle, 14px title, 13px hint, action). */
export function BookingsEmptyState(props: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  testId?: string
}) {
  return <EmptyBlock testId="bkg-empty" {...props} />
}

/**
 * Load error with retry (translated title/hint, raw message only as tooltip,
 * a 403 shows "No access" and no retry). Use it instead of an empty table or
 * an English toast when a page fails to load.
 */
export function BookingsErrorState({
  testId = "bkg-error",
  ...props
}: {
  error?: unknown
  onRetry?: () => void
  title?: string
  description?: string
  className?: string
  testId?: string
}) {
  const labels = useBookingsErrorLabels()
  return <ErrorBlock {...props} testId={testId} labels={labels} />
}

/** Centered 20px spinner with an accessible "Loading" label. */
export function BookingsLoading({ className, label }: { className?: string; label?: string }) {
  const t = useTranslations("bookingsUi")
  return <LoadingBlock className={className} label={label ?? t("loading")} testId="bkg-loading" />
}
