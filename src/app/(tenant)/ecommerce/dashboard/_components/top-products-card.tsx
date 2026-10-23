"use client"

import { Package } from "lucide-react"
import { useLocale } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { localizedName, type Translator } from "../_lib/labels"

interface TopProduct {
  product__name: Record<string, string> | string
  sold: number
  revenue: number
}

interface TopProductsCardProps {
  products: TopProduct[]
  t: Translator
}

function formatCurrency(amount: number) {
  return `₾${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function TopProductsCard({ products, t }: TopProductsCardProps) {
  const locale = useLocale()
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("topProducts.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Package className="h-10 w-10 text-muted-foreground opacity-50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("topProducts.empty")}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("topProducts.title")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea
          orientation="horizontal"
          className="w-[calc(100vw-2.25rem)] md:w-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>{t("topProducts.product")}</TableHead>
                <TableHead className="text-end">
                  {t("topProducts.sold")}
                </TableHead>
                <TableHead className="text-end">
                  {t("topProducts.revenue")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => (
                <TableRow key={index}>
                  <TableCell className="text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {localizedName(product.product__name, locale, t("topProducts.unknown"))}
                  </TableCell>
                  <TableCell className="text-end">{product.sold}</TableCell>
                  <TableCell className="text-end font-medium">
                    {formatCurrency(product.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
