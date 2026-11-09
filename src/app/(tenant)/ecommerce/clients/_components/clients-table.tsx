"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { UserX } from "lucide-react"
import type { EcommerceClientList } from "@/api/generated/interfaces"
import {
  EcEmptyState,
  EcPagination,
  EcTable,
  rdButton,
} from "@/app/(tenant)/ecommerce/_components/ui"
import { nextSort, sortClients, type ClientSort, type ClientSortKey } from "../_lib/sort"
import { getClientColumns } from "./clients-table-columns"
import { ClientsTableToolbar } from "./clients-table-toolbar"

/**
 * Keeps the row ends (status, actions) and the pager clear of the floating
 * team-chat / phone launchers (bottom right, `--fab-safe-right`): rows and the
 * header pad their end from 768px; on phones the list gets bottom room so the
 * last row can scroll above the launchers.
 */
const FAB_CLEAR = "md:[&_[role=row]]:pe-[var(--fab-safe-right)] max-md:[&_[role=rowgroup]]:pb-24"

interface ClientsTableProps {
  data: EcommerceClientList[]
  totalCount: number
  page: number
  pageSize: number
  loading: boolean
  error?: unknown
  onRetry?: () => void
  searchQuery: string
  statusFilter: string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchChange: (search: string) => void
  onStatusFilterChange: (status: string) => void
  t: (key: string, values?: Record<string, string | number>) => string
}

/**
 * Clients list body (`EcPage fill`): toolbar pinned, the table scrolls, paging
 * in the footer. Rows open the client. Sorting works on the loaded page (as
 * the old column headers did).
 */
export function ClientsTable({
  data,
  totalCount,
  page,
  pageSize,
  loading,
  error,
  onRetry,
  searchQuery,
  statusFilter,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onStatusFilterChange,
  t,
}: ClientsTableProps) {
  const router = useRouter()
  const locale = useLocale()
  const tu = useTranslations("ecommerceUi")
  const [sort, setSort] = useState<ClientSort | null>(null)

  const onSort = useCallback((key: ClientSortKey) => setSort((s) => nextSort(s, key)), [])
  const columns = useMemo(() => getClientColumns({ t, locale, sort, onSort }), [t, locale, sort, onSort])
  const rows = useMemo(() => sortClients(data, sort), [data, sort])

  const filtered = !!searchQuery || statusFilter !== "all"
  const clearFilters = () => {
    onSearchChange("")
    onStatusFilterChange("all")
  }

  return (
    <>
      <ClientsTableToolbar
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={onSearchChange}
        onStatusFilterChange={onStatusFilterChange}
        t={t}
        clearSearchLabel={tu("clearSearch")}
        allLabel={tu("all")}
      />
      <EcTable
        ariaLabel={t("tableTitle")}
        variant="fill"
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onRowClick={(c) => router.push(`/ecommerce/clients/${c.id}`)}
        testId="clients-table"
          className={FAB_CLEAR}
        empty={
          filtered ? (
            <EcEmptyState
              icon={UserX}
              title={tu("noMatches")}
              description={tu("noMatchesHint")}
              action={
                <button type="button" className={rdButton.outlineSm} onClick={clearFilters}>
                  {tu("clearFilters")}
                </button>
              }
            />
          ) : (
            <EcEmptyState icon={UserX} title={t("noClients")} />
          )
        }
        footer={
          !error && totalCount > 0 ? (
            <EcPagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              className="pe-11"
            />
          ) : undefined
        }
      />
    </>
  )
}
