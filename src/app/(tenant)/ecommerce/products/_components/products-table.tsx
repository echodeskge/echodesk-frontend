"use client"

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  VisibilityState,
  RowSelectionState,
  flexRender,
} from "@tanstack/react-table"
import { Package } from "lucide-react"
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
import { ProductList } from "@/api/generated/interfaces"
import { getProductColumns } from "./products-table-columns"
import { ProductsTableToolbar } from "./products-table-toolbar"

interface ProductsTableProps {
  data: ProductList[]
  totalCount: number
  page: number
  pageSize: number
  loading: boolean
  searchQuery: string
  statusFilter: string
  lowStockOnly: boolean
  lowStockCount: number
  locale: string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchChange: (search: string) => void
  onStatusFilterChange: (status: string) => void
  onLowStockToggle: () => void
  onAddProduct: () => void
  onEditProduct: (productId: number) => void
  onSelectionChange: (selectedIds: Set<number>) => void
  t: (key: string) => string
}

export function ProductsTable({
  data,
  totalCount,
  page,
  pageSize,
  loading,
  searchQuery,
  statusFilter,
  lowStockOnly,
  lowStockCount,
  locale,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onStatusFilterChange,
  onLowStockToggle,
  onAddProduct,
  onEditProduct,
  onSelectionChange,
  t,
}: ProductsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const columns = useMemo(
    () => getProductColumns({ t, locale, onEdit: onEditProduct }),
    [t, locale, onEditProduct]
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
      const selectedIds = new Set<number>()
      Object.keys(newSelection).forEach((rowIndex) => {
        if (newSelection[rowIndex]) {
          const product = data[parseInt(rowIndex)]
          if (product) selectedIds.add(product.id)
        }
      })
      onSelectionChange(selectedIds)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

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
        <CardHeader className="flex-row flex-wrap justify-between items-center gap-2 space-y-0">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-60" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
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
        <CardTitle>{t("tableTitle")}</CardTitle>
        <ProductsTableToolbar
          table={table}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          lowStockOnly={lowStockOnly}
          lowStockCount={lowStockCount}
          onSearchChange={onSearchChange}
          onStatusFilterChange={onStatusFilterChange}
          onLowStockToggle={onLowStockToggle}
          onAddProduct={onAddProduct}
          t={t}
        />
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t("noProductsYet")}</h3>
            <p className="text-muted-foreground mt-2">
              {t("noProductsDescription")}
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
                    onClick={() => onEditProduct(row.original.id)}
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
