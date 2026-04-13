import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTableServerPaginationProps {
  page: number
  pageSize: number
  totalCount: number
  selectedCount?: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function DataTableServerPagination({
  page,
  pageSize,
  totalCount,
  selectedCount = 0,
  onPageChange,
  onPageSizeChange,
}: DataTableServerPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const canPreviousPage = page > 1
  const canNextPage = page < pageCount

  return (
    <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
      <div className="flex-1 text-sm text-muted-foreground">
        {selectedCount > 0
          ? `${selectedCount} of ${totalCount} row(s) selected.`
          : `${totalCount} row(s) total.`}
      </div>
      <div className="flex items-center gap-x-6">
        <div className="hidden items-center gap-x-2 md:flex">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              onPageSizeChange(Number(value))
            }}
          >
            <SelectTrigger
              className={
                (buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 w-fit gap-x-2 bg-background hover:bg-accent")
              }
            >
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top" align="center">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-24 items-center justify-center text-sm font-medium">
          Page {page} of {pageCount}
        </div>
        <div className="flex items-center gap-x-2 rtl:[&>button>svg]:-scale-100">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(1)}
            disabled={!canPreviousPage}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPreviousPage}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNextPage}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(pageCount)}
            disabled={!canNextPage}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
