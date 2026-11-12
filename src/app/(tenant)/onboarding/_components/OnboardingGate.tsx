"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LayoutSkeleton } from "@/components/LayoutSkeleton"
import { useMyAccess } from "@/hooks/useMyAccess"
import { isOnboardingAdmin, useOnboardingState } from "../_lib/onboarding-api"
import { readRedirected, writeRedirected } from "../_lib/wizard"

/**
 * First-login gate (plan §1): an admin whose setup has pending steps and was
 * never started (`started_at === null`) is sent to `/onboarding` once per
 * browser session (sessionStorage flag), so leaving the wizard does not bounce
 * them back on every navigation. Non-admins and everyone after that first
 * redirect see the children straight away. While the decision is pending
 * (first load only) the layout skeleton shows instead of the page, so the
 * page does not flash before the redirect.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const access = useMyAccess()
  const admin = access.loaded && isOnboardingAdmin(access)

  // sessionStorage is client-only: unknown until after mount.
  const [redirected, setRedirected] = useState<boolean | null>(null)
  useEffect(() => {
    setRedirected(readRedirected())
  }, [])

  const onWizard = pathname?.startsWith("/onboarding") ?? false
  const query = useOnboardingState({ enabled: admin })

  const deciding = admin && !onWizard && redirected !== true
  const mustRedirect =
    deciding && redirected === false && !!query.data && query.data.pending_count > 0 && query.data.started_at === null

  useEffect(() => {
    if (!mustRedirect) return
    writeRedirected()
    setRedirected(true)
    router.replace("/onboarding")
  }, [mustRedirect, router])

  if (deciding && (redirected === null || query.isPending || mustRedirect)) {
    return <LayoutSkeleton />
  }
  return <>{children}</>
}
