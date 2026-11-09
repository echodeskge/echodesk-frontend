"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Lock } from "lucide-react"
import { LeaveEmptyState, LeaveLoading } from "./ui/states"

/**
 * Renders children only when `allowed`; a spinner while the profile loads and
 * a "turned off" notice otherwise. Pages under /leave are reachable by URL even
 * when their sidebar entry is hidden, so each HR page wraps itself in this.
 */
export function FeatureGate({
  loaded,
  allowed,
  children,
  message,
  featureOn,
}: {
  loaded: boolean
  allowed: boolean
  children: ReactNode
  message?: string
  /**
   * The HR switch behind the page. When it is on but `allowed` is false the
   * user lacks the role (e.g. not a leave manager), so a "no access" notice is
   * shown instead of "turned off in leave settings".
   */
  featureOn?: boolean
}) {
  const t = useTranslations("leave")
  if (!loaded) {
    return <LeaveLoading className="min-h-[50vh]" />
  }
  if (!allowed && featureOn && !message) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4 sm:p-6" data-testid="leave-no-access">
        <LeaveEmptyState icon={Lock} title={t("ui.noAccessTitle")} description={t("ui.noAccessHint")} />
      </div>
    )
  }
  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4 sm:p-6" data-testid="leave-feature-off">
        <LeaveEmptyState
          icon={Lock}
          title={message || t("hr.common.featureDisabled")}
          description={message ? undefined : t("ui.featureDisabledHint")}
        />
      </div>
    )
  }
  return <>{children}</>
}
