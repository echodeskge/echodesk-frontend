"use client"

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
  flexRender,
} from "@tanstack/react-table"
import { Search, Plus, Tags } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-column-toggle"
import { DataTableServerPagination } from "@/components/ui/data-table/data-table-pagination"
import { AttributeDefinition } from "@/api/generated"
import { getAttributeColumns } from "./attributes-table-columns"

interface AttributesTableProps {
  data: AttributeDefinition[]
  loading: boolean
  locale: string
  onAdd: () => void
  onEdit: (attribute: AttributeDefinition) => void
  onDelete: (attribute: AttributeDefinition) => void
  t: (key: string) => string
}

export function AttributesTable({
  data,
  loading,
  locale,
  onAdd,
  onEdit,
  onDelete,
  t,
}: AttributesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const columns = useMemo(
    () => getAttributeColumns({ t, locale, onEdit, onDelete }),
    [t, locale, onEdit, onDelete]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex-row flex-wrap justify-between items-center gap-2 space-y-0">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-60" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border-b px-4 py-3">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap justify-between items-center gap-2 space-y-0">
        <CardTitle>{t("tableTitle")}</CardTitle>
        <div className="flex items-center gap-2 max-md:w-full max-md:flex-wrap">
          <div className="relative max-md:w-full">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={
                (table.getColumn("name")?.getFilterValue() as string) ?? ""
              }
              onChange={(e) =>
                table.getColumn("name")?.setFilterValue(e.target.value)
              }
              className="h-9 pl-8 max-md:w-full md:w-60"
              aria-label="Search attributes"
            />
          </div>
          <DataTableViewOptions table={table} />
          <Button size="sm" className="h-9" onClick={onAdd}>
            <Plus className="me-2 h-3.5 w-3.5" />
            {t("addAttribute")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-center py-12">
            <Tags className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              {t("noAttributesYet")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {t("noAttributesDescription")}
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
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
      {data.length > 0 && (
        <CardFooter className="block py-3">
          <DataTableServerPagination
            page={table.getState().pagination.pageIndex + 1}
            pageSize={table.getState().pagination.pageSize}
            totalCount={data.length}
            onPageChange={(p) => table.setPageIndex(p - 1)}
            onPageSizeChange={(s) => table.setPageSize(s)}
          />
        </CardFooter>
      )}
    </Card>
  )
}
