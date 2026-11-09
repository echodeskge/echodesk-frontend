import { MoneyCell, parseMoney } from "../../_components/ui"

/**
 * A shipping amount: `₾7.00`, or `freeLabel` ("Free") for a zero price when
 * one is given. Missing / unparseable amounts render "—" (MoneyCell).
 */
export function ShippingPriceCell({ value, freeLabel }: { value: string | number | null | undefined; freeLabel?: string }) {
  if (freeLabel && parseMoney(value ?? null) === 0) {
    return <span className="font-medium text-green-700 dark:text-green-400">{freeLabel}</span>
  }
  return <MoneyCell value={value} />
}

/**
 * Delivery time text, or null when not set. Keeps the page's rule: 0 / empty
 * days show no estimate ("—").
 */
export function formatEta(days: number | null | undefined, label: (count: number) => string): string | null {
  return days ? label(days) : null
}
