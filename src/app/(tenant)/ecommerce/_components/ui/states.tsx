"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import type { LucideIcon } from "lucide-react"
import { EmptyBlock, ErrorBlock, LoadingBlock, type ErrorBlockLabels } from "@/components/redesign/states"

/** The shared error texts in the e-commerce catalog (`ecommerceUi.*`). */
export function useEcErrorLabels(): ErrorBlockLabels {
  const t = useTranslations("ecommerceUi")
  return {
    errorTitle: t("errorTitle"),
    errorHint: t("errorHint"),
    noAccessTitle: t("noAccessTitle"),
    noAccessHint: t("noAccessHint"),
    retry: t("retry"),
  }
}

/** Centered empty state (40px muted icon circle, 14px title, 13px hint, action). */
export function EcEmptyState(props: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  testId?: string
}) {
  return <EmptyBlock testId="ec-empty" {...props} />
}

/**
 * Load error with retry (translated title/hint, raw message only as tooltip,
 * a 403 shows "No access" and no retry). Use it instead of an empty table or
 * an English toast when a list fails to load.
 */
export function EcErrorState({
  testId = "ec-error",
  ...props
}: {
  error?: unknown
  onRetry?: () => void
  title?: string
  description?: string
  className?: string
  testId?: string
}) {
  const labels = useEcErrorLabels()
  return <ErrorBlock {...props} testId={testId} labels={labels} />
}

/** Centered 20px spinner with an accessible "Loading" label. */
export function EcLoading({ className, label }: { className?: string; label?: string }) {
  const t = useTranslations("ecommerceUi")
  return <LoadingBlock className={className} label={label ?? t("loading")} testId="ec-loading" />
}
