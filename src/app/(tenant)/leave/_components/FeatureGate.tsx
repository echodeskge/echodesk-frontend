"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Loader2, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

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
}: {
  loaded: boolean
  allowed: boolean
  children: ReactNode
  message?: string
}) {
  const t = useTranslations("leave")
  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  if (!allowed) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Lock className="h-10 w-10 mx-auto mb-3" />
            {message || t("hr.common.featureDisabled")}
          </CardContent>
        </Card>
      </div>
    )
  }
  return <>{children}</>
}
