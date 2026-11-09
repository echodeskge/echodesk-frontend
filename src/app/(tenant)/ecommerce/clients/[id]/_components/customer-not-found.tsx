"use client"

import Link from "next/link"
import { ChevronLeft, UserX } from "lucide-react"
import { EcEmptyState, rdButton } from "@/app/(tenant)/ecommerce/_components/ui"

interface CustomerNotFoundProps {
  t: (key: string) => string
}

export function CustomerNotFound({ t }: CustomerNotFoundProps) {
  return (
    <EcEmptyState
      icon={UserX}
      title={t("notFound")}
      description={t("notFoundDescription")}
      testId="client-not-found"
      action={
        <Link href="/ecommerce/clients" className={rdButton.outlineSm}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          {t("backToClients")}
        </Link>
      }
    />
  )
}
