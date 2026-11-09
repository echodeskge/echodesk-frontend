"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Plus, SearchX, Tags } from "lucide-react"
import type { AttributeDefinition } from "@/api/generated"
import {
  EcEmptyState,
  EcPagination,
  EcTable,
  Toolbar,
  ToolbarSearch,
  ToolbarSpacer,
  rdButton,
} from "@/app/(tenant)/ecommerce/_components/ui"
import { pageSlice, sortRows, type SortState } from "../../products/_lib/table-kit"
import { ColumnsMenu } from "../../products/_components/table-kit"
import {
  HIDEABLE_ATTRIBUTE_COLUMNS,
  attributeSortAccessors,
  getAttributeColumns,
  matchesAttribute,
} from "./attributes-table-columns"

interface AttributesTableProps {
  /** `undefined` while loading. */
  data: AttributeDefinition[] | undefined
  error?: unknown
  onRetry?: () => void
  locale: string
  onAdd: () => void
  onEdit: (attribute: AttributeDefinition) => void
  onDelete: (attribute: AttributeDefinition) => void
}

const DEFAULT_PAGE_SIZE = 10

/**
 * Attributes list (design LIST PAGE): inset toolbar with search (name in any
 * language or key) and the column menu, then a bordered table card. The
 * whole list is loaded once, so search, sorting and paging run here (as
 * with TanStack before; 10 per page by default).
 */
export function AttributesTable({ data, error, onRetry, locale, onAdd, onEdit, onDelete }: AttributesTableProps) {
  const t = useTranslations("productAttributes")
  const tc = useTranslations("common")
  const tu = useTranslations("ecommerceUi")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortState | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  useEffect(() => setPage(1), [search])

  const filtered = useMemo(
    () => (data ? sortRows(data.filter((a) => matchesAttribute(a, search)), sort, attributeSortAccessors(locale)) : undefined),
    [data, search, sort, locale]
  )
  const pageCount = Math.max(1, Math.ceil((filtered?.length ?? 0) / pageSize))
  const currentPage = Math.min(page, pageCount)
  const rows = filtered ? pageSlice(filtered, currentPage, pageSize) : undefined

  const columns = useMemo(
    () =>
      getAttributeColumns({
        t,
        tc,
        moreLabel: tu("moreActions"),
        locale,
        sort,
        onSortChange: setSort,
        onEdit,
        onDelete,
        hidden,
      }),
    [t, tc, tu, locale, sort, onEdit, onDelete, hidden]
  )

  const columnLabels = HIDEABLE_ATTRIBUTE_COLUMNS.map((id) => ({
    id,
    label:
      id === "type" ? t("table.type") : id === "options" ? t("options") : id === "flags" ? t("properties") : t("table.status"),
  }))

  const empty =
    search.trim() && (data?.length ?? 0) > 0 ? (
      <EcEmptyState
        icon={SearchX}
        title={tu("noMatches")}
        description={tu("noMatchesHint")}
        action={
          <button type="button" className={rdButton.outlineSm} onClick={() => setSearch("")}>
            {tu("clearSearch")}
          </button>
        }
      />
    ) : (
      <EcEmptyState
        icon={Tags}
        title={t("noAttributesYet")}
        description={t("noAttributesDescription")}
        action={
          <button type="button" className={rdButton.primary} onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("createFirstAttribute")}
          </button>
        }
      />
    )

  return (
    <>
      <Toolbar inset testId="ec-attributes-toolbar">
        <ToolbarSearch
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
          clearLabel={tu("clearSearch")}
          className="max-w-[320px]"
          testId="ec-attributes-search"
        />
        <ToolbarSpacer />
        <ColumnsMenu columns={columnLabels} hidden={hidden} onChange={setHidden} />
      </Toolbar>
      <EcTable<AttributeDefinition>
        variant="card"
        ariaLabel={t("tableTitle")}
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        error={error}
        onRetry={onRetry}
        onRowClick={onEdit}
        empty={empty}
        skeletonRows={5}
        testId="ec-attributes-table"
        footer={
          !error && (filtered?.length ?? 0) > 0 ? (
            <EcPagination
              page={currentPage}
              pageSize={pageSize}
              totalCount={filtered?.length ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          ) : undefined
        }
      />
    </>
  )
}
