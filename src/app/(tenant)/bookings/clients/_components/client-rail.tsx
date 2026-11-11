"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { CalendarCheck, Loader2, Mail, Phone, X } from "lucide-react"
import type { BookingClient, BookingClientStats, BookingList } from "@/api/generated/interfaces"
import { cn } from "@/lib/utils"
import {
  Avatar,
  BookingStatusPill,
  BookingsEmptyState,
  BookingsErrorState,
  TonePill,
  displayName,
  formatBookingDate,
  formatMoney,
  formatTimeRange,
  rdButton,
} from "../../_components/ui"
import { fetchClientBookings, fetchClientStats } from "../../_lib/bookings-api"

/**
 * Client detail rail (the Clients screen pattern): identity + contact, the
 * `{id}/stats` tiles and the client's bookings from `{id}/bookings`, each
 * linking to the booking page.
 */
export function ClientRail({
  client,
  stats,
  onStats,
  onClose,
  className,
}: {
  client: BookingClient
  /** Already loaded stats (from the list's lazy load), if any. */
  stats?: BookingClientStats
  onStats?: (id: number, stats: BookingClientStats) => void
  onClose: () => void
  className?: string
}) {
  const t = useTranslations("bookingsClients.rail")
  const tc = useTranslations("bookingsClients")
  const locale = useLocale()
  const [localStats, setLocalStats] = useState<BookingClientStats | null>(stats ?? null)
  const [bookings, setBookings] = useState<BookingList[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setError(null)
    setBookings(null)
    const loads: Promise<unknown>[] = [
      fetchClientBookings(client.id, locale).then((list) => active && setBookings(list)),
    ]
    if (!stats) {
      loads.push(
        fetchClientStats(client.id).then((s) => {
          if (!active) return
          setLocalStats(s)
          onStats?.(client.id, s)
        })
      )
    }
    Promise.all(loads).catch((e) => active && setError(e))
    return () => {
      active = false
    }
    // `onStats` is a stable callback from the screen; reloading on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, locale, stats, attempt])

  const s = stats ?? localStats
  const tiles = [
    { key: "total", label: t("stats.total"), value: s?.total_bookings },
    { key: "completed", label: t("stats.completed"), value: s?.completed_bookings },
    { key: "cancelled", label: t("stats.cancelled"), value: s?.cancelled_bookings },
    { key: "spent", label: t("stats.spent"), value: s ? formatMoney(s.total_spent) : undefined },
  ]

  return (
    <aside className={cn("flex flex-col overflow-y-auto border-s bg-background", className)} data-testid="bkg-client-rail" aria-label={t("title")}>
      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b pe-2 ps-4">
        <span className="flex-1 text-[13px] font-semibold">{t("title")}</span>
        <button type="button" onClick={onClose} aria-label={t("close")} className={rdButton.ghostIconSm} data-testid="bkg-client-rail-close">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={client.full_name || client.email || client.phone_number} size={28} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{client.full_name || "—"}</span>
            <TonePill tone={client.is_verified ? "success" : "neutral"} dot className="mt-1 w-fit">
              {client.is_verified ? tc("verified") : tc("unverified")}
            </TonePill>
          </div>
        </div>
        <dl className="flex flex-col gap-1.5 text-[13px]">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <dd className="truncate font-mono text-xs tabular-nums">{client.phone_number || "—"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <dd className="truncate">{client.email || "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-px border-b bg-border" data-testid="bkg-client-stats">
        {tiles.map((tile) => (
          <div key={tile.key} className="flex flex-col gap-0.5 bg-background px-4 py-2.5">
            <span className="truncate text-[11px] text-muted-foreground">{tile.label}</span>
            <span className="text-lg font-semibold tabular-nums tracking-[-.02em]">{tile.value === undefined || tile.value === null ? "—" : tile.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col">
        <div className="flex h-10 items-center px-4 text-xs font-medium uppercase tracking-[.03em] text-muted-foreground">{t("bookings")}</div>
        {error ? (
          <BookingsErrorState error={error} onRetry={() => setAttempt((n) => n + 1)} title={t("loadFailed")} className="py-6" />
        ) : bookings === null ? (
          <div className="flex items-center justify-center py-8" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : bookings.length === 0 ? (
          <BookingsEmptyState icon={CalendarCheck} title={t("noBookings")} className="py-6" />
        ) : (
          <ul className="flex flex-col" data-testid="bkg-client-bookings">
            {bookings.map((b) => (
              <li key={b.id} className="border-t">
                <Link href={`/bookings/bookings/${b.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-muted/40" data-testid="bkg-client-booking">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{displayName(b.service, locale)}</span>
                    <span className="truncate text-[11px] text-muted-foreground tabular-nums">
                      {formatBookingDate(b.date, locale)} · {formatTimeRange(b.start_time, b.end_time)} · {formatMoney(b.total_amount)}
                    </span>
                  </span>
                  <BookingStatusPill status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
