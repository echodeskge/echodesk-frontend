"use client"

import { DataTable, type Column, type DataTableProps } from "@/components/redesign/data-table"
import { BookingsErrorState } from "./states"

export type BookingsColumn<T> = Column<T>
export type BookingsTableProps<T> = Omit<DataTableProps<T>, "idPrefix" | "renderError">

const renderError = (error: unknown, onRetry?: () => void) => <BookingsErrorState error={error} onRetry={onRetry} />

/**
 * Bookings data table: the shared redesign `DataTable` (sticky header, 40px
 * rows, two-line rows below 768px, skeleton / empty / error states) with the
 * `bkg-table-*` test ids and the translated bookings error state.
 */
export function BookingsTable<T>(props: BookingsTableProps<T>) {
  return <DataTable idPrefix="bkg" renderError={renderError} {...props} />
}
