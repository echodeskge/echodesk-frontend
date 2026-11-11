"use client"

import type { ReactNode } from "react"
import { PageShell } from "@/components/redesign/page"

export {
  Page as BookingsPage,
  PageHeader as BookingsPageHeader,
  PageBanner as BookingsBanner,
} from "@/components/redesign/page"
export type { PageProps as BookingsPageProps, PageWidth as BookingsPageWidth } from "@/components/redesign/page"

/**
 * The bookings route shell (rendered by `bookings/layout.tsx`): the
 * full-height scroll container, test id `bkg-shell`. Pages render a
 * `BookingsPage` (padded column) or `BookingsPage fill` and never add their
 * own outer `p-6`.
 */
export function BookingsShell({ children }: { children: ReactNode }) {
  return <PageShell testId="bkg-shell">{children}</PageShell>
}
