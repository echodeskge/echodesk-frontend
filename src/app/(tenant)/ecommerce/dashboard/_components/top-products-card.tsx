"use client"

import { Package, Trophy } from "lucide-react"
import { useLocale } from "next-intl"
import { EcEmptyState, InfoCard, MoneyCell, formatCount, localizedText } from "../../_components/ui"
import type { Translator } from "../_lib/labels"

interface TopProduct {
  product__name: Record<string, string> | string
  sold: number
  revenue: number
}

interface TopProductsCardProps {
  products: TopProduct[]
  t: Translator
}

const ROW = "grid grid-cols-[20px_minmax(0,1fr)_56px_96px] items-center gap-3 px-4"

/**
 * Best sellers: rank, name, units sold, revenue. A compact grid instead of the
 * data table: the card is half width, where the table would switch to its
 * two-line phone layout.
 */
export function TopProductsCard({ products, t }: TopProductsCardProps) {
  const locale = useLocale()
  return (
    <InfoCard title={t("topProducts.title")} icon={<Trophy />} flush testId="ec-dash-top-products">
      {products.length === 0 ? (
        <EcEmptyState icon={Package} title={t("topProducts.empty")} className="py-8" />
      ) : (
        <div role="table" aria-label={t("topProducts.title")}>
          <div
            role="row"
            className={`${ROW} h-8 border-b text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground`}
          >
            <span role="columnheader">#</span>
            <span role="columnheader" className="truncate">
              {t("topProducts.product")}
            </span>
            <span role="columnheader" className="truncate text-end">
              {t("topProducts.sold")}
            </span>
            <span role="columnheader" className="truncate text-end">
              {t("topProducts.revenue")}
            </span>
          </div>
          {products.map((p, index) => (
            <div
              key={index}
              role="row"
              className={`${ROW} h-10 border-b text-[13px] last:border-b-0`}
              data-testid="ec-dash-top-product"
            >
              <span role="cell" className="text-xs text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span role="cell" className="truncate font-medium">
                {localizedText(p.product__name, locale, t("topProducts.unknown"))}
              </span>
              <span role="cell" className="text-end tabular-nums">
                {formatCount(p.sold)}
              </span>
              <span role="cell" className="text-end">
                <MoneyCell value={p.revenue} className="font-medium" />
              </span>
            </div>
          ))}
        </div>
      )}
    </InfoCard>
  )
}
