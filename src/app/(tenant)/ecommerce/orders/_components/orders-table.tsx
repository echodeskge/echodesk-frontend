"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Archive, SearchX, ShoppingCart } from "lucide-react"
import { EcEmptyState, EcPagination, EcTable, rdButton } from "../../_components/ui"
import { OrderListItem } from "../_types"
import { getOrderColumns, orderSortValue } from "./orders-table-columns"
import { sortRows, type SortState } from "./sort-header"

type Translate = (key: string, values?: Record<string, string | number>) => string

interface OrdersTableProps {
  data: OrderListItem[] | undefined
  totalCount: number
  page: number
  pageSize: number
  loading: boolean
  error?: unknown
  onRetry: () => void
  filtered: boolean
  onClearFilters: () => void
  selected: ReadonlySet<number>
  onSelectionChange: (selectedIds: Set<number>) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  /** Cleaned (hidden) orders view: "cleaned on" instead of status, own empty state. */
  cleaned?: boolean
  /** "Restore" row action (cleaned view, store admins). */
  onRestore?: (orderId: number) => void
  t: Translate
  tUi: Translate
}

/** Orders list (fills the page height and scrolls; paging footer). Row click opens the order. */
export function OrdersTable({
  data,
  totalCount,
  page,
  pageSize,
  loading,
  error,
  onRetry,
  filtered,
  onClearFilters,
  selected,
  onSelectionChange,
  onPageChange,
  onPageSizeChange,
  cleaned,
  onRestore,
  t,
  tUi,
}: OrdersTableProps) {
  const router = useRouter()
  const locale = useLocale()
  const [sort, setSort] = useState<SortState | null>(null)
  const rows = useMemo(() => (data ? sortRows(data, sort, orderSortValue) : undefined), [data, sort])

  const columns = getOrderColumns({
    t,
    tUi,
    locale,
    rows: rows ?? [],
    selected,
    onSelectionChange,
    sort,
    onSort: setSort,
    cleaned,
    onRestore,
  })

  const showFooter = !error && !!data && data.length > 0

  return (
    <EcTable
      variant="fill"
      columns={columns}
      rows={rows}
      rowKey={(o) => o.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      isRowSelected={(o) => selected.has(o.id)}
      onRowClick={(o) => router.push(`/ecommerce/orders/${o.id}`)}
      ariaLabel={t("ordersTitle")}
      skeletonRows={10}
      testId="ec-orders-table"
      empty={
        filtered ? (
          <EcEmptyState
            icon={SearchX}
            title={tUi("noMatches")}
            description={t("noOrdersFiltered")}
            action={
              <button type="button" className={rdButton.outlineSm} onClick={onClearFilters}>
                {tUi("clearFilters")}
              </button>
            }
          />
        ) : cleaned ? (
          <EcEmptyState icon={Archive} title={t("cleaned.noCleaned")} description={t("cleaned.noCleanedHint")} />
        ) : (
          <EcEmptyState icon={ShoppingCart} title={t("noOrders")} description={t("noOrdersYet")} />
        )
      }
      footer={
        showFooter ? (
          <EcPagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            selectedCount={selected.size}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        ) : undefined
      }
    />
  )
}
