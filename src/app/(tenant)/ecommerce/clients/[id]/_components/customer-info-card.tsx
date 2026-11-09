"use client"

import { Info, MapPin } from "lucide-react"
import type { EcommerceClient } from "@/api/generated/interfaces"
import { InfoCard, InfoRows, TonePill, formatEcDate } from "@/app/(tenant)/ecommerce/_components/ui"

interface CustomerInfoCardProps {
  client: EcommerceClient
  locale: string
  t: (key: string) => string
}

/** Contact rows (only filled ones, as before) and every saved address (default first). */
export function CustomerInfoCard({ client, locale, t }: CustomerInfoCardProps) {
  const rows = [
    {
      key: "phone",
      label: t("fields.phone"),
      value: client.phone_number ? (
        <a href={`tel:${client.phone_number}`} className="tabular-nums hover:underline">
          {client.phone_number}
        </a>
      ) : null,
    },
    {
      key: "email",
      label: t("fields.email"),
      value: client.email ? (
        <a href={`mailto:${client.email}`} className="hover:underline">
          {client.email}
        </a>
      ) : null,
    },
    {
      key: "dob",
      label: t("fields.dateOfBirth"),
      value: client.date_of_birth ? formatEcDate(client.date_of_birth, locale, { year: "always" }) : null,
    },
    { key: "joined", label: t("fields.joined"), value: formatEcDate(client.created_at, locale, { year: "always" }) },
  ].map((r) => ({ ...r, hidden: !r.value }))

  const addresses = [...(client.addresses || [])].sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default))

  return (
    <>
      <InfoCard title={t("information")} icon={<Info />} testId="client-info-card">
        <InfoRows rows={rows} />
      </InfoCard>
      <InfoCard title={t("addresses")} icon={<MapPin />} testId="client-addresses-card">
        {addresses.length === 0 ? (
          <p className="py-1 text-xs text-muted-foreground">{t("noAddresses")}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {addresses.map((a) => (
              <li key={a.id} className="flex min-w-0 flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  {a.label && <span className="truncate text-[13px] font-medium">{a.label}</span>}
                  {a.is_default && <TonePill tone="info">{t("defaultAddress")}</TonePill>}
                </span>
                <span className="text-[13px] [overflow-wrap:anywhere]">
                  {[a.address, a.city].filter(Boolean).join(", ")}
                </span>
                {a.extra_instructions && (
                  <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{a.extra_instructions}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </InfoCard>
    </>
  )
}
