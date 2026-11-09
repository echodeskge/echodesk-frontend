"use client"

import type { ReactNode } from "react"
import { PageShell } from "@/components/redesign/page"

export {
  Page as EcPage,
  PageHeader as EcPageHeader,
  PageBanner as EcBanner,
} from "@/components/redesign/page"
export type { PageProps as EcPageProps, PageWidth as EcPageWidth } from "@/components/redesign/page"

/**
 * The e-commerce route shell (rendered by `ecommerce/layout.tsx`): the
 * full-height scroll container, test id `ec-shell`. Pages render an
 * `EcPage` (padded column) or `EcPage fill` (pinned toolbar, scrolling table)
 * and never add their own outer `container p-4`.
 */
export function EcShell({ children }: { children: ReactNode }) {
  return <PageShell testId="ec-shell">{children}</PageShell>
}
