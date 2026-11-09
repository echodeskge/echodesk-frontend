"use client"

import { ExternalLink, Truck } from "lucide-react"
import { useLocale } from "next-intl"
import { IdText, InfoCard, InfoRows, localizedText } from "../../../_components/ui"
import { OrderDetail } from "../../_types"
import { getCourierInfo } from "../../_lib/utils"

type Translate = (key: string, values?: Record<string, string | number>) => string

interface OrderShippingCardProps {
  order: OrderDetail
  t: Translate
}

/** Delivery address, shipping method, tracking number, courier and the tracking link. */
export function OrderShippingCard({ order, t }: OrderShippingCardProps) {
  const locale = useLocale()
  const address = order.delivery_address
  const shipping = order.shipping_method_details
  const courier = getCourierInfo(order.payment_metadata)
  const courierName = courier.booked ?? courier.chosen ?? order.courier_provider
  const hasTracking = order.tracking_number || courierName

  if (!address && !shipping && !hasTracking) return null

  const shippingName = shipping
    ? localizedText(shipping.name as Record<string, string> | string, locale, t("detail.shippingMethod"))
    : ""

  return (
    <InfoCard title={t("detail.deliveryAddress")} icon={<Truck />} testId="ec-order-shipping">
      <div className="flex flex-col gap-2">
        {address && (
          <address className="flex flex-col gap-0.5 text-[13px] not-italic [overflow-wrap:anywhere]">
            {address.label && <span className="font-medium">{address.label}</span>}
            {address.address && <span>{address.address}</span>}
            {address.city && <span>{address.city}</span>}
            {address.extra_instructions && (
              <span className="mt-1 text-xs italic text-muted-foreground">{address.extra_instructions}</span>
            )}
          </address>
        )}
        {(shipping || hasTracking) && (
          <InfoRows
            className={address ? "border-t pt-1" : undefined}
            rows={[
              {
                key: "method",
                label: t("detail.shippingMethod"),
                value: (
                  <span className="flex flex-col items-end">
                    <span>{shippingName}</span>
                    {shipping?.estimated_days ? (
                      <span className="text-xs text-muted-foreground">
                        {t("detail.estimatedDays", { days: String(shipping.estimated_days) })}
                      </span>
                    ) : null}
                  </span>
                ),
                hidden: !shipping,
              },
              {
                key: "tracking",
                label: t("detail.tracking"),
                value: <IdText className="whitespace-normal">{order.tracking_number}</IdText>,
                hidden: !order.tracking_number,
              },
              {
                key: "courier",
                label: t("detail.courierProvider"),
                value: (
                  <span className="flex flex-col items-end">
                    <span>{courierName}</span>
                    {courier.booked && courier.chosen && (
                      <span className="text-xs text-muted-foreground">{t("detail.customerChose", { courier: courier.chosen })}</span>
                    )}
                  </span>
                ),
                hidden: !courierName,
              },
            ]}
          />
        )}
        {courier.trackingUrl && (
          <a
            href={courier.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 self-start text-[13px] text-primary hover:underline"
          >
            {t("detail.trackShipment")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>
    </InfoCard>
  )
}
