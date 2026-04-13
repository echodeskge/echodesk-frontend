"use client"

import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "../../_lib/utils"
import { OrderDetail } from "../../_types"

interface OrderItemsCardProps {
  order: OrderDetail
  t: (key: string) => string
}

export function OrderItemsCard({ order, t }: OrderItemsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detail.orderItems")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea
          orientation="horizontal"
          className="w-[calc(100vw-2.25rem)] md:w-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("detail.product")}</TableHead>
                <TableHead className="text-center">
                  {t("detail.quantity")}
                </TableHead>
                <TableHead className="text-end">
                  {t("detail.price")}
                </TableHead>
                <TableHead className="text-end">
                  {t("detail.total")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item) => {
                const productName =
                  typeof item.product_name === "object"
                    ? item.product_name.en ||
                      item.product_name.ka ||
                      "Product"
                    : item.product_name
                const productImage = (item as unknown as Record<string, unknown>)
                  .product_image as string | undefined

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {productImage && (
                          <Image
                            src={productImage}
                            alt={String(productName)}
                            width={36}
                            height={36}
                            className="aspect-square rounded-md object-cover"
                          />
                        )}
                        <div>
                          <span className="text-sm font-medium">
                            {productName}
                          </span>
                          {item.variant && (
                            <p className="text-xs text-muted-foreground">
                              Variant ID: {item.variant}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-end">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-end">
                      {formatCurrency(item.subtotal)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>
        <Separator />
        <div className="space-y-2 p-4">
          {order.subtotal && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("detail.subtotal")}
              </span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
          )}
          {order.shipping_cost && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("detail.shipping")}
              </span>
              <span>
                {parseFloat(order.shipping_cost) === 0
                  ? t("detail.free")
                  : formatCurrency(order.shipping_cost)}
              </span>
            </div>
          )}
          {order.tax_amount && parseFloat(order.tax_amount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("detail.tax")}</span>
              <span>{formatCurrency(order.tax_amount)}</span>
            </div>
          )}
          {order.discount_amount && parseFloat(order.discount_amount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("detail.discount")}
              </span>
              <span className="text-green-600">
                -{formatCurrency(order.discount_amount)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>{t("detail.total")}</span>
            <span>{formatCurrency(order.total_amount)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
