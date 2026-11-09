"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Package, Plus, SearchX } from "lucide-react"
import type { ProductList } from "@/api/generated/interfaces"
import {
  EcEmptyState,
  EcPagination,
  EcTable,
  rdButton,
  selectionColumn,
} from "@/app/(tenant)/ecommerce/_components/ui"
import { sortRows, type SortState } from "../_lib/table-kit"
import { getProductColumns, productName, productSortAccessors } from "./products-table-columns"

interface ProductsTableProps {
  /** `undefined` while the first page loads. */
  data: ProductList[] | undefined
  totalCount: number
  page: number
  pageSize: number
  loading: boolean
  error?: unknown
  onRetry?: () => void
  filtered: boolean
  locale: string
  selected: ReadonlySet<number>
  hiddenColumns: ReadonlySet<string>
  onSelectionChange: (ids: Set<number>) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onAddProduct: () => void
  onEditProduct: (productId: number) => void
  onClearFilters: () => void
}

/**
 * The products table: select, product (32px thumb + name), SKU, price
 * (struck old price), stock (amber when low, red when sold out), status and
 * the row menu. Row click opens the edit sheet. Sorting applies to the
 * loaded page, as before. Footer: range, rows per page, paging.
 */
export function ProductsTable({
  data,
  totalCount,
  page,
  pageSize,
  loading,
  error,
  onRetry,
  filtered,
  locale,
  selected,
  hiddenColumns,
  onSelectionChange,
  onPageChange,
  onPageSizeChange,
  onAddProduct,
  onEditProduct,
  onClearFilters,
}: ProductsTableProps) {
  const t = useTranslations("products")
  const tu = useTranslations("ecommerceUi")
  const [sort, setSort] = useState<SortState | null>(null)

  const rows = useMemo(
    () => (data ? sortRows(data, sort, productSortAccessors(locale)) : undefined),
    [data, sort, locale]
  )

  const columns = useMemo(
    () => [
      selectionColumn<ProductList>({
        rows: rows ?? [],
        getId: (p) => p.id,
        selected,
        onChange: onSelectionChange,
        selectAllLabel: tu("selectAll"),
        selectRowLabel: (p) => tu("selectRow", { name: productName(p, locale, t("unnamed")) }),
      }),
      ...getProductColumns({ t, locale, sort, onSortChange: setSort, onEdit: onEditProduct, hidden: hiddenColumns }),
    ],
    [rows, selected, onSelectionChange, tu, t, locale, sort, onEditProduct, hiddenColumns]
  )

  const empty = filtered ? (
    <EcEmptyState
      icon={SearchX}
      title={tu("noMatches")}
      description={tu("noMatchesHint")}
      action={
        <button type="button" className={rdButton.outlineSm} onClick={onClearFilters}>
          {tu("clearFilters")}
        </button>
      }
    />
  ) : (
    <EcEmptyState
      icon={Package}
      title={t("noProductsYet")}
      description={t("noProductsDescription")}
      action={
        <button type="button" className={rdButton.primary} onClick={onAddProduct}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("createFirstProduct")}
        </button>
      }
    />
  )

  const showFooter = !error && (rows?.length ?? 0) > 0

  return (
    <EcTable<ProductList>
      variant="fill"
      ariaLabel={t("tableTitle")}
      columns={columns}
      rows={rows}
      rowKey={(p) => p.id}
      loading={loading && !data}
      error={error}
      onRetry={onRetry}
      onRowClick={(p) => onEditProduct(p.id)}
      isRowSelected={(p) => selected.has(p.id)}
      empty={empty}
      skeletonRows={10}
      testId="ec-products-table"
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
