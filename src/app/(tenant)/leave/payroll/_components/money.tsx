"use client"

import { cn } from "@/lib/utils"

/** Tabular amount with the currency as a muted suffix (payroll tables). */
export function MoneyCell({
  amount,
  currency,
  strong,
  className,
}: {
  /** Already formatted (`formatMoney`); "—" hides the currency. */
  amount: string
  currency?: string | null
  strong?: boolean
  className?: string
}) {
  return (
    <span className={cn("whitespace-nowrap font-mono text-xs tabular-nums", strong && "font-semibold", className)}>
      {amount}
      {currency && amount !== "—" && <span className="ms-1 font-sans text-[11px] font-normal text-muted-foreground">{currency}</span>}
    </span>
  )
}
