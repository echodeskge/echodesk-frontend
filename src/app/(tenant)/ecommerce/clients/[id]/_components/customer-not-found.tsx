"use client"

import Link from "next/link"
import { UserX, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CustomerNotFoundProps {
  t: (key: string) => string
}

export function CustomerNotFound({ t }: CustomerNotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center p-16">
      <UserX className="h-16 w-16 text-muted-foreground" />
      <h2 className="mt-4 text-xl font-semibold">{t("notFound")}</h2>
      <p className="mt-2 text-muted-foreground">
        {t("notFoundDescription")}
      </p>
      <Button variant="ghost" size="sm" className="mt-4" asChild>
        <Link href="/ecommerce/clients">
          <ChevronLeft className="me-1 h-4 w-4" />
          {t("backToClients")}
        </Link>
      </Button>
    </div>
  )
}
