"use client"

import { Wallet } from "lucide-react"
import { TONE_DOT, type Tone } from "@/components/redesign/tones"
import { cn } from "@/lib/utils"
import { InfoCard, MoneyCell, TonePill, formatMoney, formatPercent } from "../../_components/ui"
import { labelOr, type Translator } from "../_lib/labels"

interface RevenueMethod {
  payment_method: string
  revenue: number
  count: number
  percentage: number
}

interface RevenueByMethodCardProps {
  data: RevenueMethod[]
  t: Translator
}

const METHOD_TONE: Record<string, Tone> = {
  card: "info",
  cash_on_delivery: "success",
  saved_card: "violet",
}

export function methodTone(method: string): Tone {
  return METHOD_TONE[method] ?? "neutral"
}

function getMethodLabel(method: string, t: Translator): string {
  return labelOr(t, `paymentMethods.${method || "unknown"}`, method)
}

/** Paid revenue, an 8px stacked bar by payment method and one legend row per method. */
export function RevenueByMethodCard({ data, t }: RevenueByMethodCardProps) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <InfoCard title={t("revenueByMethod.title")} icon={<Wallet />} testId="ec-dash-methods">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-semibold leading-7 tabular-nums tracking-[-.02em]">{formatMoney(total)}</span>
          <span className="text-xs text-muted-foreground">{t("revenueByMethod.totalRevenue")}</span>
        </div>

        {data.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("revenueByMethod.noData")}</p>
        ) : (
          <>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              {data.map((d) => (
                <span
                  key={d.payment_method || "unknown"}
                  className={cn("h-full", TONE_DOT[methodTone(d.payment_method)])}
                  style={{ width: `${total > 0 ? (d.revenue / total) * 100 : 0}%` }}
                />
              ))}
            </div>
            <ul className="flex flex-col">
              {data.map((d) => (
                <li
                  key={d.payment_method || "unknown"}
                  className="flex min-h-8 items-center gap-2 text-[13px]"
                  data-testid="ec-dash-method-row"
                >
                  <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[methodTone(d.payment_method)])} />
                  <span className="min-w-0 flex-1 truncate">{getMethodLabel(d.payment_method, t)}</span>
                  <MoneyCell value={d.revenue} className="font-medium" />
                  <TonePill tone="neutral" className="w-14 justify-center tabular-nums">
                    {formatPercent(d.percentage)}
                  </TonePill>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </InfoCard>
  )
}
