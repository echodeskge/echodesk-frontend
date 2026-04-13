"use client"

import Link from "next/link"
import { PackageX, ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface OrderNotFoundProps {
  t: (key: string) => string
}

export function OrderNotFound({ t }: OrderNotFoundProps) {
  return (
    <div className="p-6">
      <Card>
        <CardContent className="py-12 text-center">
          <PackageX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">
            {t("detail.orderNotFound")}
          </h3>
          <p className="text-muted-foreground mt-2">
            {t("detail.orderNotFoundDescription")}
          </p>
          <Button asChild className="mt-4">
            <Link href="/ecommerce/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("detail.backToOrders")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
