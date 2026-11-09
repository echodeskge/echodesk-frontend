"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import type { EcommerceClient } from "@/api/generated/interfaces"
import { ActivePill, Avatar, TonePill, formatEcDate, rdButton } from "@/app/(tenant)/ecommerce/_components/ui"

interface CustomerHeaderCardProps {
  client: EcommerceClient
  locale: string
  t: (key: string, values?: Record<string, string>) => string
}

/** Full-width summary card: back, 28px avatar, name + e-mail, status / verified pills, joined date. */
export function CustomerHeaderCard({ client, locale, t }: CustomerHeaderCardProps) {
  const name = client.full_name || client.email
  return (
    <section
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-3 sm:px-4"
      data-testid="client-header-card"
    >
      <Link
        href="/ecommerce/clients"
        className={rdButton.ghostIconSm}
        aria-label={t("backToClients")}
        title={t("backToClients")}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </Link>
      <Avatar name={name} size={28} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="truncate text-[15px] font-semibold leading-5">{name}</h2>
        <span className="truncate text-xs text-muted-foreground">{client.email}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 max-sm:w-full max-sm:ps-[76px]">
        <ActivePill active={client.is_active} />
        {client.is_verified ? (
          <TonePill tone="info">{t("verified")}</TonePill>
        ) : (
          <TonePill tone="neutral">{t("unverified")}</TonePill>
        )}
        <span className="ms-1 text-xs tabular-nums text-muted-foreground">
          {t("joinedOn", { date: formatEcDate(client.created_at, locale) })}
        </span>
      </div>
    </section>
  )
}
