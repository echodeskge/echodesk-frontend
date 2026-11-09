import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Mono 12px identifier (order number, SKU, promo code, language code). */
export function IdText({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span className={cn("truncate font-mono text-xs tabular-nums", className)} title={title}>
      {children}
    </span>
  )
}
