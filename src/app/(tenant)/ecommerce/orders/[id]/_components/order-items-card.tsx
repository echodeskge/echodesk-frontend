"use client"

import { useLocale } from "next-intl"
import { Package } from "lucide-react"
import {
  EcTable,
  IdText,
  InfoCard,
  MoneyCell,
  ProductThumb,
  SummaryRows,
  formatCount,
  parseMoney,
  type EcColumn,
} from "../../../_components/ui"
import { getCourierInfo } from "../../_lib/utils"
import { OrderDetail } from "../../_types"

type Translate = (key: string, values?: Record<string, string | number>) => string
type Localized = string | Record<string, string> | null | undefined

/** Readable variant info sent by the API with each order line. */
interface VariantDetails {
  id: number
  sku: string
  name: Localized
  image: string | null
  attributes: { key: string; name: Localized; value: Localized | Localized[] }[]
}

function localized(value: Localized, locale: string): string {
  if (value == null) return ""
  if (typeof value !== "object") return String(value)
  return value[locale] || value.ka || value.en || Object.values(value)[0] || ""
}

/** "Black / 41 · Color: black · Size: 41" */
export function variantSummary(details: VariantDetails, locale: string): string {
  const name = localized(details.name, locale)
  const attrs = (details.attributes ?? [])
    .map((a) => {
      const value = Array.isArray(a.value)
        ? a.value.map((v) => localized(v, locale)).join(", ")
        : localized(a.value, locale)
      return value ? `${localized(a.name, locale) || a.key}: ${value}` : ""
    })
    .filter(Boolean)
  return [name, ...attrs].filter(Boolean).join(" · ")
}

type Item = NonNullable<OrderDetail["items"]>[number]

interface OrderItemsCardProps {
  order: OrderDetail
  t: Translate
}

/** Order lines and the money summary (subtotal, shipping, tax, discount, total). */
export function OrderItemsCard({ order, t }: OrderItemsCardProps) {
  const locale = useLocale()
  const courier = getCourierInfo(order.payment_metadata)

  const columns: EcColumn<Item>[] = [
    {
      id: "product",
      header: t("detail.product"),
      width: "minmax(0,1fr)",
      mobile: "title",
      cell: (item) => {
        const productName = localized(item.product_name as Localized, locale) || t("detail.product")
        const extra = item as unknown as { product_image?: string | null; variant_details?: VariantDetails | null }
        const variantDetails = extra.variant_details
        const productImage = variantDetails?.image || extra.product_image || undefined
        return (
          <span className="flex min-w-0 items-center gap-3">
            <ProductThumb src={productImage} alt="" size={32} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{productName}</span>
              {variantDetails ? (
                <>
                  <span className="truncate text-xs text-muted-foreground">{variantSummary(variantDetails, locale)}</span>
                  {variantDetails.sku && <IdText className="text-[11px] text-muted-foreground">{variantDetails.sku}</IdText>}
                </>
              ) : (
                item.variant && <span className="text-xs text-muted-foreground">#{item.variant}</span>
              )}
            </span>
          </span>
        )
      },
    },
    {
      id: "quantity",
      header: t("detail.quantity"),
      width: "72px",
      align: "center",
      mobile: "meta",
      className: "tabular-nums",
      cell: (item) => (
        <span>
          <span className="@3xl:hidden">× </span>
          {formatCount(item.quantity)}
        </span>
      ),
    },
    {
      id: "price",
      header: t("detail.price"),
      width: "104px",
      align: "end",
      mobile: "meta",
      cell: (item) => <MoneyCell value={item.price} />,
    },
    {
      id: "total",
      header: t("detail.total"),
      width: "104px",
      align: "end",
      mobile: "end",
      cell: (item) => <MoneyCell value={item.subtotal} className="font-medium" />,
    },
  ]

  const shippingLabel = `${t("detail.shipping")}${
    courier.pickup ? ` · ${t("detail.pickup")}` : courier.chosen ? ` · ${courier.chosen}` : ""
  }`
  const tax = parseMoney(order.tax_amount)
  const discount = parseMoney(order.discount_amount)

  return (
    <InfoCard title={t("detail.orderItems")} icon={<Package />} flush testId="ec-order-items">
      <EcTable
        variant="flush"
        columns={columns}
        rows={order.items ?? []}
        rowKey={(item) => item.id}
        rowClassName={() => "@3xl:h-auto @3xl:min-h-12 @3xl:py-2"}
        ariaLabel={t("detail.orderItems")}
        testId="ec-order-items-table"
      />
      <div className="border-t px-4 py-3">
        <SummaryRows
          rows={[
            {
              key: "subtotal",
              label: t("detail.subtotal"),
              value: <MoneyCell value={order.subtotal} />,
              hidden: !order.subtotal,
            },
            {
              key: "shipping",
              label: shippingLabel,
              value: parseMoney(order.shipping_cost) === 0 ? t("detail.free") : <MoneyCell value={order.shipping_cost} />,
              hidden: !order.shipping_cost,
            },
            {
              key: "tax",
              label: t("detail.tax"),
              value: <MoneyCell value={order.tax_amount} />,
              hidden: !(tax && tax > 0),
            },
            {
              key: "discount",
              label: t("detail.discount"),
              value: <MoneyCell value={order.discount_amount} negative className="text-green-700 dark:text-green-400" />,
              hidden: !(discount && discount > 0),
            },
          ]}
          total={{ label: t("detail.total"), value: <MoneyCell value={order.total_amount} /> }}
        />
      </div>
    </InfoCard>
  )
}
