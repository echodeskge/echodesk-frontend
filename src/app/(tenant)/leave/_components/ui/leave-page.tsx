"use client"

import type { ReactNode } from "react"
import { PageShell } from "@/components/redesign/page"

// Page layout primitives are shared (promoted to `@/components/redesign/page`).
export {
  PageHeader as LeavePageHeader,
  Page as LeavePage,
  PageBanner as LeaveBanner,
} from "@/components/redesign/page"
export type { PageProps as LeavePageProps, PageWidth as LeavePageWidth } from "@/components/redesign/page"

/** The leave section's route shell (rendered by `leave/layout.tsx`), test id `leave-shell`. */
export function LeaveShell({ children }: { children: ReactNode }) {
  return <PageShell testId="leave-shell">{children}</PageShell>
}
