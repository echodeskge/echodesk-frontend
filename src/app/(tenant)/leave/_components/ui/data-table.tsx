"use client"

import { DataTable, gridTemplate, isFromInteractive, type Column, type DataTableProps, type MobileSlot } from "@/components/redesign/data-table"
import { LeaveErrorState } from "./states"

export { gridTemplate, isFromInteractive }
export type { MobileSlot }
export type LeaveColumn<T> = Column<T>
export type LeaveTableProps<T> = Omit<DataTableProps<T>, "idPrefix" | "renderError">

const renderLeaveError = (error: unknown, onRetry?: () => void) => <LeaveErrorState error={error} onRetry={onRetry} />

/**
 * Leave data table: the shared redesign `DataTable` (promoted to
 * `@/components/redesign`) with leave's test ids and translated error state.
 */
export function LeaveTable<T>(props: LeaveTableProps<T>) {
  return <DataTable idPrefix="leave" renderError={renderLeaveError} {...props} />
}
