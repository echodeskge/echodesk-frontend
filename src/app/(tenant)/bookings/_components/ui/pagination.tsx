"use client"

import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { rdButton } from "@/components/redesign/buttons"
import { cn } from "@/lib/utils"

export const PAGE_SIZES = [10, 20, 30, 50, 100] as const

/** "21–40" for page 2 of 20 per page (clamped to the total; "0" when empty). */
export function pageRange(page: number, pageSize: number, total: number): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 }
  const from = Math.min(total, (page - 1) * pageSize + 1)
  const to = Math.min(total, page * pageSize)
  return { from, to }
}

/**
 * Server-side paging for a `BookingsTable` footer (36px, 11px text, like the
 * e-commerce orders list): "21–40 of 135", "Rows per page" (from `sm`),
 * "Page 2 of 7" and 28px previous / next buttons.
 */
export function BookingsPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  className,
}: {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  /** Omit to hide the page-size picker. */
  onPageSizeChange?: (pageSize: number) => void
  className?: string
}) {
  const t = useTranslations("bookingsUi")
  const tt = useTranslations("common.table")
  const pageCount = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)))
  const { from, to } = pageRange(page, pageSize, totalCount)
  return (
    <div className={cn("flex w-full min-w-0 items-center gap-3", className)} data-testid="bkg-pagination">
      <span className="min-w-0 truncate">{t("range", { from, to, total: totalCount })}</span>
      <span className="ms-auto flex items-center gap-2">
        {onPageSizeChange && (
          <label className="hidden items-center gap-1.5 sm:flex">
            <span>{tt("rowsPerPage")}</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-6 rounded border border-input bg-background px-1 text-[11px] tabular-nums text-foreground"
              data-testid="bkg-page-size"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="whitespace-nowrap">{tt("pageOf", { page, pageCount })}</span>
        <button
          type="button"
          className={cn(rdButton.ghostIconSm, "h-6 w-6")}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={tt("previousPage")}
          title={tt("previousPage")}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className={cn(rdButton.ghostIconSm, "h-6 w-6")}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label={tt("nextPage")}
          title={tt("nextPage")}
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </span>
    </div>
  )
}
