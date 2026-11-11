"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { SearchX, Users } from "lucide-react"
import type { BookingClient, BookingClientStats } from "@/api/generated/interfaces"
import { fetchBookingClient, fetchBookingClients, fetchClientStats } from "../_lib/bookings-api"
import {
  BookingsEmptyState,
  BookingsHeaderBridge,
  BookingsPage,
  BookingsPagination,
  BookingsTable,
  Toolbar,
  ToolbarSearch,
  rdButton,
} from "../_components/ui"
import { getClientColumns } from "./_components/clients-columns"
import { ClientRail } from "./_components/client-rail"

const DEFAULT_PAGE_SIZE = 20

/** `?client=<id>` (the booking detail's client link) → a positive integer id, or null. */
export function parseClientParam(raw: string | null | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

/** Reads `?client=` on mount (own component: `useSearchParams` needs a Suspense boundary). */
function ClientDeepLink({ onLinked, clearRef }: { onLinked: (id: number) => void; clearRef: React.MutableRefObject<() => void> }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const linkedId = parseClientParam(params?.get("client"))

  const clearParam = useCallback(() => {
    if (!params?.has("client")) return
    const next = new URLSearchParams(params.toString())
    next.delete("client")
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [params, pathname, router])

  useEffect(() => {
    clearRef.current = clearParam
  }, [clearRef, clearParam])

  useEffect(() => {
    if (linkedId !== null) onLinked(linkedId)
  }, [linkedId, onLinked])

  return null
}

export default function BookingClientsPage() {
  const t = useTranslations("bookingsClients")
  const tUi = useTranslations("bookingsUi")
  const [clients, setClients] = useState<BookingClient[] | undefined>(undefined)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [search, setSearch] = useState("")
  const [localSearch, setLocalSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [stats, setStats] = useState<Record<number, BookingClientStats>>({})
  const [openId, setOpenId] = useState<number | null>(null)
  // A deep-linked client that is not on the current page (loaded by id).
  const [linkedClient, setLinkedClient] = useState<BookingClient | null>(null)
  const clearDeepLink = useRef<() => void>(() => {})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchBookingClients({ page, pageSize, search })
      setClients(res.results ?? [])
      setTotalCount(res.count ?? 0)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    load()
  }, [load])

  // Search debounce (300ms, server `search`: name, phone, email).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch)
        setPage(1)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, search])

  // Bookings count per row: `{id}/stats` for the rows of the page, loaded lazily after the list.
  useEffect(() => {
    if (!clients) return
    let active = true
    const missing = clients.filter((c) => stats[c.id] === undefined)
    if (missing.length === 0) return
    Promise.allSettled(missing.map((c) => fetchClientStats(c.id).then((s) => [c.id, s] as const))).then((results) => {
      if (!active) return
      const next: Record<number, BookingClientStats> = {}
      for (const r of results) if (r.status === "fulfilled") next[r.value[0]] = r.value[1]
      if (Object.keys(next).length > 0) setStats((prev) => ({ ...prev, ...next }))
    })
    return () => {
      active = false
    }
    // `stats` is only read to skip loaded ids; re-running on it would refetch nothing new.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients])

  const onStats = useCallback((id: number, s: BookingClientStats) => setStats((prev) => ({ ...prev, [id]: s })), [])

  const onLinked = useCallback((id: number) => setOpenId(id), [])

  // The deep-linked client may not be on the page: a row on the page wins, `{id}/` is only
  // called when it is missing; an unknown id closes the rail and drops the param.
  useEffect(() => {
    if (openId === null) {
      setLinkedClient(null)
      return
    }
    if (clients?.some((c) => c.id === openId)) {
      setLinkedClient(null)
      return
    }
    if (!clients) return
    let active = true
    fetchBookingClient(openId)
      .then((c) => active && setLinkedClient(c))
      .catch(() => {
        if (!active) return
        setOpenId(null)
        clearDeepLink.current()
      })
    return () => {
      active = false
    }
  }, [openId, clients])

  const closeRail = useCallback(() => {
    setOpenId(null)
    clearDeepLink.current()
  }, [])

  const counts = useMemo(() => {
    const out: Record<number, number | undefined> = {}
    for (const [id, s] of Object.entries(stats)) out[Number(id)] = s.total_bookings
    return out
  }, [stats])
  const columns = useMemo(() => getClientColumns({ t, counts }), [t, counts])
  const openClient = openId !== null ? (clients?.find((c) => c.id === openId) ?? linkedClient) : null
  const clearFilters = () => {
    setLocalSearch("")
    setSearch("")
    setPage(1)
  }

  return (
    <BookingsPage fill testId="bkg-clients">
      <BookingsHeaderBridge sub={clients && !error ? t("count", { count: totalCount }) : null} />
      <Suspense fallback={null}>
        <ClientDeepLink onLinked={onLinked} clearRef={clearDeepLink} />
      </Suspense>
      <section className="relative flex min-h-0 w-full flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Toolbar testId="bkg-clients-toolbar">
            <ToolbarSearch value={localSearch} onChange={setLocalSearch} placeholder={t("searchPlaceholder")} clearLabel={tUi("clearSearch")} testId="bkg-clients-search" />
          </Toolbar>
          <BookingsTable
            variant="fill"
            columns={columns}
            rows={clients}
            rowKey={(c) => c.id}
            loading={loading}
            error={error}
            onRetry={load}
            onRowClick={(c) => setOpenId(c.id)}
            isRowSelected={(c) => c.id === openId}
            ariaLabel={t("title")}
            skeletonRows={10}
            testId="bkg-clients-table"
            empty={
              search ? (
                <BookingsEmptyState
                  icon={SearchX}
                  title={tUi("noMatches")}
                  description={tUi("noMatchesHint")}
                  action={
                    <button type="button" className={rdButton.outlineSm} onClick={clearFilters}>
                      {tUi("clearFilters")}
                    </button>
                  }
                />
              ) : (
                <BookingsEmptyState icon={Users} title={t("noClients")} description={t("noClientsHint")} />
              )
            }
            footer={
              !error && clients && clients.length > 0 ? (
                <BookingsPagination
                  page={page}
                  pageSize={pageSize}
                  totalCount={totalCount}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => {
                    setPageSize(s)
                    setPage(1)
                  }}
                />
              ) : undefined
            }
          />
        </div>
        {openClient && (
          <ClientRail
            key={openClient.id}
            client={openClient}
            stats={stats[openClient.id]}
            onStats={onStats}
            onClose={closeRail}
            className="absolute inset-0 z-20 w-full md:static md:z-auto md:w-[340px] md:shrink-0"
          />
        )}
      </section>
    </BookingsPage>
  )
}
