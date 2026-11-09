"use client"

import { DataTable, type Column, type DataTableProps } from "@/components/redesign/data-table"
import { EcErrorState } from "./states"

export type EcColumn<T> = Column<T>
export type EcTableProps<T> = Omit<DataTableProps<T>, "idPrefix" | "renderError">

const renderEcError = (error: unknown, onRetry?: () => void) => <EcErrorState error={error} onRetry={onRetry} />

/**
 * E-commerce data table: the shared redesign `DataTable` (sticky 32px header,
 * 40px rows, two-line rows below 768px, skeleton / empty / error states) with
 * the `ec-table-*` test ids and the translated e-commerce error state.
 * Selection = `selectionColumn`, paging = `footer={<EcPagination .../>}`.
 */
export function EcTable<T>(props: EcTableProps<T>) {
  return <DataTable idPrefix="ec" renderError={renderEcError} {...props} />
}
