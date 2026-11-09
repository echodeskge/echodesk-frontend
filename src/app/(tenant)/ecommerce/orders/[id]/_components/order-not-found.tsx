"use client"

import Link from "next/link"
import { ArrowLeft, PackageX } from "lucide-react"
import { EcEmptyState, EcErrorState, rdButton } from "../../../_components/ui"

interface OrderNotFoundProps {
  t: (key: string) => string
  /** A load error other than 404: shows the error state with retry instead. */
  error?: unknown
  onRetry?: () => void
}

function BackLink({ label }: { label: string }) {
  return (
    <Link href="/ecommerce/orders" className={rdButton.outlineSm}>
      <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
      {label}
    </Link>
  )
}

/** 404 / load error for the order page, with a way back to the list. */
export function OrderNotFound({ t, error, onRetry }: OrderNotFoundProps) {
  return (
    <section className="w-full p-4 sm:p-6">
      <div className="flex max-w-[1200px] flex-col items-center rounded-lg border bg-card">
        {error ? (
          <>
            <EcErrorState error={error} onRetry={onRetry} />
            <div className="-mt-6 pb-8">
              <BackLink label={t("detail.backToOrders")} />
            </div>
          </>
        ) : (
          <EcEmptyState
            icon={PackageX}
            title={t("detail.orderNotFound")}
            description={t("detail.orderNotFoundDescription")}
            action={<BackLink label={t("detail.backToOrders")} />}
          />
        )}
      </div>
    </section>
  )
}
