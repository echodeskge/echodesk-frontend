"use client"

import { DataTable, type Column, type DataTableProps } from "@/components/redesign/data-table"
import { cn } from "@/lib/utils"
import { EcErrorState } from "./states"

export type EcColumn<T> = Column<T>
export type EcTableProps<T> = Omit<DataTableProps<T>, "idPrefix" | "renderError">

/**
 * Full-height ("fill") tables reach the bottom-right corner, where the app's
 * floating call / team-chat launchers sit (`--fab-safe-right`, globals.css).
 * From 768px the rows and header pad their end so row menus and pills stay
 * clickable; on phones the row list gets bottom room so the last row can
 * scroll above the launchers; the pager always keeps prev / next clear.
 */
export const EC_FAB_CLEAR =
  "md:[&_[role=row]]:pe-[var(--fab-safe-right)] max-md:[&_[role=rowgroup]]:pb-24 [&_[data-testid=ec-pagination]]:pe-[var(--fab-safe-right)]"

const renderEcError = (error: unknown, onRetry?: () => void) => <EcErrorState error={error} onRetry={onRetry} />

/**
 * E-commerce data table: the shared redesign `DataTable` (sticky 32px header,
 * 40px rows, two-line rows below 768px, skeleton / empty / error states) with
 * the `ec-table-*` test ids and the translated e-commerce error state.
 * Selection = `selectionColumn`, paging = `footer={<EcPagination .../>}`.
 * Fill tables keep clear of the floating launchers (`EC_FAB_CLEAR`).
 */
export function EcTable<T>({ className, ...props }: EcTableProps<T>) {
  const fill = (props.variant ?? "fill") === "fill"
  return <DataTable idPrefix="ec" renderError={renderEcError} {...props} className={cn(fill && EC_FAB_CLEAR, className)} />
}
