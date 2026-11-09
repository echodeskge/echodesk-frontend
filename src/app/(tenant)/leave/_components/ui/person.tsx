"use client"

import { cn } from "@/lib/utils"
import { initials } from "@/app/(tenant)/tickets/_components/primitives/initials"

/** 22px initials avatar (tickets list size; primary/10 tint). Georgian-safe initials. */
export function LeaveAvatar({ name, size = 22, className }: { name: string; size?: 22 | 28; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        size === 22 ? "size-[22px] text-[9px]" : "size-7 text-[10px]",
        className
      )}
    >
      {initials(name)}
    </span>
  )
}

/** Avatar + name (+ muted second line) for table cells and cards. */
export function PersonCell({
  name,
  sub,
  size = 22,
  className,
}: {
  name: string
  sub?: string | null
  size?: 22 | 28
  className?: string
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <LeaveAvatar name={name} size={size} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-medium">{name}</span>
        {sub && <span className="truncate text-[11px] text-muted-foreground">{sub}</span>}
      </span>
    </span>
  )
}
