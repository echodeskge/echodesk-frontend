"use client"

import { useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  VisibilityState,
  RowSelectionState,
  flexRender,
} from "@tanstack/react-table"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTableServerPagination } from "@/components/ui/data-table/data-table-pagination"
import { OrderListItem } from "../_types"
import { getOrderColumns } from "./orders-table-columns"
import { OrdersTableToolbar } from "./orders-table-toolbar"

interface OrdersTableProps {
  data: OrderListItem[]
  totalCount: number
  page: number
  pageSize: number
  loading: boolean
  searchQuery: string
  statusFilter: string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchChange: (search: string) => void
  onStatusFilterChange: (status: string) => void
  onSelectionChange: (selectedIds: Set<number>) => void
  onExportAll: () => void
  t: (key: string) => string
}

export function OrdersTable({
  data,
  totalCount,
  page,
  pageSize,
  loading,
  searchQuery,
  statusFilter,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onStatusFilterChange,
  onSelectionChange,
  onExportAll,
  t,
}: OrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const router = useRouter()

  const columns = useMemo(
    () => getOrderColumns({ t }),
    [t]
  )

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex: page - 1, pageSize },
    },
    manualPagination: true,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater
      setRowSelection(newSelection)
      // Convert row selection to Set of order IDs
      const selectedIds = new Set<number>()
      Object.keys(newSelection).forEach((rowIndex) => {
        if (newSelection[rowIndex]) {
          const order = data[parseInt(rowIndex)]
          if (order) selectedIds.add(order.id)
        }
      })
      onSelectionChange(selectedIds)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Reset row selection when data changes (page change, filter, etc.)
  const dataKey = data.map((d) => d.id).join(",")
  useMemo(() => {
    setRowSelection({})
  }, [dataKey])

  const selectedCount = Object.keys(rowSelection).filter(
    (k) => rowSelection[k]
  ).length

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex-row justify-between items-center gap-x-1.5 space-y-0">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-40" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="border-b px-4 py-3">
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap justify-between items-center gap-2 space-y-0">
        <CardTitle>{t("ordersTitle")}</CardTitle>
        <OrdersTableToolbar
          table={table}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSearchChange={onSearchChange}
          onStatusFilterChange={onStatusFilterChange}
          onExportAll={onExportAll}
          t={t}
        />
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t("noOrders")}</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery || statusFilter !== "all"
                ? t("noOrdersFiltered")
                : t("noOrdersYet")}
            </p>
          </div>
        ) : (
          <ScrollArea
            orientation="horizontal"
            className="w-[calc(100vw-2.25rem)] md:w-auto"
          >
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer"
                    onClick={() => router.push(`/ecommerce/orders/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
      {data.length > 0 && (
        <CardFooter className="block py-3">
          <DataTableServerPagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            selectedCount={selectedCount}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </CardFooter>
      )}
    </Card>
  )
}
