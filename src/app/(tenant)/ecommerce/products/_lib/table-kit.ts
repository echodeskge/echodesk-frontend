/**
 * Client-side sorting and column visibility for the EC-02 tables (products,
 * product attributes). Both pages sorted the rows they had loaded (the
 * products API page, the full attribute list) with TanStack before the
 * redesign; this keeps that behaviour without TanStack.
 */

export type SortDirection = "asc" | "desc"
export interface SortState {
  id: string
  direction: SortDirection
}
export type SortValue = string | number | boolean | null | undefined

/** Header click: none -> ascending -> descending -> none (per column). */
export function nextSort(current: SortState | null, id: string): SortState | null {
  if (!current || current.id !== id) return { id, direction: "asc" }
  if (current.direction === "asc") return { id, direction: "desc" }
  return null
}

function compareValues(a: SortValue, b: SortValue): number {
  const emptyA = a === null || a === undefined || a === ""
  const emptyB = b === null || b === undefined || b === ""
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? -1 : 1
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })
}

/**
 * A sorted copy (stable). Empty values stay last in both directions, so a
 * descending sort does not start with a block of dashes.
 */
export function sortRows<T>(
  rows: readonly T[],
  sort: SortState | null,
  accessors: Record<string, (row: T) => SortValue>
): T[] {
  const get = sort ? accessors[sort.id] : undefined
  if (!sort || !get) return [...rows]
  const sign = sort.direction === "asc" ? 1 : -1
  return rows
    .map((row, index) => ({ row, index, value: get(row) }))
    .sort((x, y) => {
      const emptyX = x.value === null || x.value === undefined || x.value === ""
      const emptyY = y.value === null || y.value === undefined || y.value === ""
      if (emptyX !== emptyY) return emptyX ? 1 : -1
      return compareValues(x.value, y.value) * sign || x.index - y.index
    })
    .map((x) => x.row)
}

/** A decimal string from the API ("35.00") as a number for sorting. */
export function numericValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/** One client-side page of a list (1-based page, clamped). */
export function pageSlice<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const size = Math.max(1, pageSize)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(Math.max(1, page), pages)
  return rows.slice((p - 1) * size, p * size)
}
