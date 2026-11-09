"use client"

import { cn } from "@/lib/utils"
import { formatMoney, parseMoney, type MoneyOptions } from "./format"

/**
 * An amount with tabular figures (`₾1,234.50`). `compare` = the old price,
 * shown struck through and muted after the amount when it is higher (product
 * prices). `negative` renders discounts as "-₾10.00".
 */
export function MoneyCell({
  value,
  compare,
  className,
  testId,
  ...opts
}: MoneyOptions & {
  value: string | number | null | undefined
  compare?: string | number | null
  className?: string
  testId?: string
}) {
  const c = parseMoney(compare ?? null)
  const v = parseMoney(value)
  const showCompare = c !== null && v !== null && c > v
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 whitespace-nowrap tabular-nums", className)} data-testid={testId}>
      <span>{formatMoney(value, opts)}</span>
      {showCompare && (
        <span className="text-[11px] text-muted-foreground line-through">{formatMoney(compare, { noSign: opts.noSign })}</span>
      )}
    </span>
  )
}
