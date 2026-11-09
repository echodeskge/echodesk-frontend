"use client"

import type { EcommerceClientList } from "@/api/generated/interfaces"
import {
  ActivePill,
  PersonCell,
  TonePill,
  formatEcDate,
  type EcColumn,
} from "@/app/(tenant)/ecommerce/_components/ui"
import type { ClientSort, ClientSortKey } from "../_lib/sort"
import { SortHeader } from "./sort-header"

type T = (key: string, values?: Record<string, string | number>) => string

interface ColumnOptions {
  t: T
  locale: string
  sort: ClientSort | null
  onSort: (key: ClientSortKey) => void
}

/**
 * Clients table (SPEC §2 EC-03): client (avatar, name, e-mail) | phone |
 * verified | status | joined. Below 768px: name + status on line 1, phone ·
 * verified · joined on line 2.
 */
export function getClientColumns({ t, locale, sort, onSort }: ColumnOptions): EcColumn<EcommerceClientList>[] {
  const head = (key: ClientSortKey, label: string, align?: "start" | "end") => (
    <SortHeader
      label={label}
      sortKey={key}
      sort={sort}
      onSort={onSort}
      sortLabel={t("sortBy", { column: label })}
      align={align}
    />
  )
  return [
    {
      id: "client",
      header: head("full_name", t("table.client")),
      width: "minmax(0,1.6fr)",
      mobile: "title",
      cell: (c) => <PersonCell name={c.full_name || c.email} sub={c.email} />,
    },
    {
      id: "phone",
      header: head("phone_number", t("table.phone")),
      width: "minmax(0,1fr)",
      mobile: "meta",
      cell: (c) => <span className="truncate tabular-nums">{c.phone_number || "—"}</span>,
    },
    {
      id: "verified",
      header: head("is_verified", t("table.verified")),
      width: "130px",
      mobile: "meta",
      cell: (c) =>
        c.is_verified ? (
          <TonePill tone="info">{t("status.verified")}</TonePill>
        ) : (
          <TonePill tone="neutral">{t("status.unverified")}</TonePill>
        ),
    },
    {
      id: "status",
      header: head("is_active", t("table.status")),
      width: "110px",
      mobile: "end",
      cell: (c) => <ActivePill active={c.is_active} />,
    },
    {
      id: "joined",
      header: head("created_at", t("table.registered"), "end"),
      width: "110px",
      align: "end",
      mobile: "meta",
      muted: true,
      cell: (c) => <span className="tabular-nums">{formatEcDate(c.created_at, locale)}</span>,
    },
  ]
}
