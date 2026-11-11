"use client"

import type { BookingClient } from "@/api/generated/interfaces"
import { PersonCell, TonePill, type BookingsColumn } from "../../_components/ui"

type Translate = (key: string, values?: Record<string, string | number>) => string

/**
 * Clients directory columns: Client (avatar + name) | Phone (mono) | Email |
 * Verified pill | Bookings (count from `{id}/stats`, "…" while it loads).
 * Below 768px: name + verified on line 1, phone · email · bookings on line 2.
 */
export function getClientColumns({ t, counts }: { t: Translate; counts: Record<number, number | undefined> }): BookingsColumn<BookingClient>[] {
  return [
    {
      id: "client",
      header: t("table.name"),
      width: "minmax(0,1.5fr)",
      mobile: "title",
      cell: (c) => <PersonCell name={c.full_name || c.email || c.phone_number} />,
    },
    {
      id: "phone",
      header: t("table.phone"),
      width: "150px",
      mobile: "meta",
      numeric: true,
      cell: (c) => <span className="truncate">{c.phone_number || "—"}</span>,
    },
    {
      id: "email",
      header: t("table.email"),
      width: "minmax(0,1.3fr)",
      mobile: "meta",
      cell: (c) => <span className="truncate">{c.email || "—"}</span>,
    },
    {
      id: "verified",
      header: t("table.verified"),
      width: "120px",
      mobile: "end",
      cell: (c) => (
        <TonePill tone={c.is_verified ? "success" : "neutral"} dot testId="bkg-client-verified">
          {c.is_verified ? t("verified") : t("unverified")}
        </TonePill>
      ),
    },
    {
      id: "bookings",
      header: t("table.bookings"),
      width: "90px",
      align: "end",
      mobile: "meta",
      numeric: true,
      cell: (c) => {
        const n = counts[c.id]
        return <span data-testid="bkg-client-count">{n === undefined ? "…" : n}</span>
      },
    },
  ]
}
