"use client"

import { User } from "lucide-react"
import { InfoCard, InfoRows } from "../../../_components/ui"
import { OrderDetail } from "../../_types"

interface OrderCustomerCardProps {
  order: OrderDetail
  t: (key: string) => string
}

/** Name, e-mail and phone of the customer (the delivery address is in the delivery card). */
export function OrderCustomerCard({ order, t }: OrderCustomerCardProps) {
  const client = order.client_details

  return (
    <InfoCard title={t("detail.customer")} icon={<User />} testId="ec-order-customer">
      <InfoRows
        rows={[
          { key: "name", label: t("detail.name"), value: <span className="font-medium">{client?.full_name || t("unknownCustomer")}</span> },
          {
            key: "email",
            label: t("detail.email"),
            value: client?.email ? (
              <a href={`mailto:${client.email}`} className="hover:underline">
                {client.email}
              </a>
            ) : null,
            hidden: !client?.email,
          },
          {
            key: "phone",
            label: t("detail.phone"),
            value: client?.phone_number ? (
              <a href={`tel:${client.phone_number}`} className="tabular-nums hover:underline">
                {client.phone_number}
              </a>
            ) : null,
            hidden: !client?.phone_number,
          },
        ]}
      />
    </InfoCard>
  )
}
