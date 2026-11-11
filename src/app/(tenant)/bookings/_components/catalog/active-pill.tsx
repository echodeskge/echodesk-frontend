"use client"

import { TonePill } from "@/components/redesign/pill"
import { cn } from "@/lib/utils"

/**
 * Design catalog status pill (services / categories / staff / availability):
 * "Active" / "Working" is a solid foreground pill, "Inactive" / "Day off" an
 * outline one, "Coming soon" amber. Labels come translated from the page.
 */
export function ActivePill({
  active,
  label,
  tone = active ? "solid" : "outline",
  className,
  testId = "bkg-active-pill",
}: {
  active: boolean
  label: string
  tone?: "solid" | "outline" | "warning"
  className?: string
  testId?: string
}) {
  if (tone === "warning") {
    return (
      <TonePill tone="warning" className={className} testId={testId}>
        {label}
      </TonePill>
    )
  }
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-full shrink-0 items-center whitespace-nowrap rounded border px-[7px] text-[11px] font-medium",
        tone === "solid" ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground",
        className
      )}
      data-active={active || undefined}
      data-testid={testId}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}
